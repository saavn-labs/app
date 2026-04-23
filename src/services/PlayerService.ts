import { AUDIO_QUALITY, STORAGE_KEYS } from "@/constants";
import { downloadService } from "@/services/DownloadService";
import { appStorage } from "@/stores/storage";
import { PlayerStatus, RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import type { TrackItem } from "react-native-nitro-player";
import { PlayerQueue, TrackPlayer } from "react-native-nitro-player";
import { queueService } from "./QueueService";

export interface PlayerState {
  status: PlayerStatus;
  currentSong: Models.Song | null;
  upcomingTracks: Models.Song[];
  progress: number;
  duration: number;
  repeatMode: RepeatMode;
}

export type StateUpdater = (updates: Partial<PlayerState>) => void;

export interface IPlayerService {
  setStateUpdater(updater: StateUpdater): void;
  play(song: Models.Song, providedQueue?: Models.Song[]): Promise<void>;
  resume(): Promise<void>;
  pause(): Promise<void>;
  togglePlayPause(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setRepeatMode(mode: RepeatMode): Promise<void>;
  stop(): Promise<void>;
  addToQueue(song: Models.Song): Promise<void>;
  addNextInQueue(song: Models.Song): Promise<void>;
  restoreLastPlayedTrack(
    currentSong: Models.Song | null,
    progress: number,
  ): Promise<void>;
}


export class PlayerService implements IPlayerService {
  private stateUpdater: StateUpdater | null = null;
  private isInitialized = false;
  private wantsToPlay = false;
  private currentPlaylistId: string | null = null;

  constructor() {
    this.initialize();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await TrackPlayer.configure({
      androidAutoEnabled: true,
      carPlayEnabled: true,
      showInNotification: true,
      lookaheadCount: 4,
    });

    this.setupEventListeners();
    this.isInitialized = true;
  }

  setStateUpdater(updater: StateUpdater): void {
    this.stateUpdater = updater;
  }

  private setupEventListeners(): void {
    TrackPlayer.onChangeTrack(async (track, _reason) => {
      if (!track) return;

      const song = queueService.getSongById(track.id);

      if (song) {
        queueService.onTrackChanged(track.id);

        this.notify({
          currentSong: song,
          status: this.wantsToPlay ? "playing" : "paused",
          progress: 0,
          duration: song.duration ? song.duration * 1000 : 0,
        });

        const state = await TrackPlayer.getState();
        const queue = await TrackPlayer.getActualQueue();

        if (state.currentIndex >= queue.length - 2) {
          await this.maybeExtendQueue(song.id);
        }
      }
    });

    TrackPlayer.onPlaybackProgressChange((position, totalDuration, _isManuallySeeked) => {
      this.notify({
        progress: position * 1000,
        duration: totalDuration * 1000,
      });
    });

    TrackPlayer.onPlaybackStateChange((state, _reason) => {
      let status: PlayerStatus;

      if (state === "playing") {
        status = "playing";
      } else if (state === "paused") {
        status = "paused";
      } else {
        status = this.wantsToPlay ? "loading" : "paused";
      }

      this.notify({ status });
    });
  }

  async play(song: Models.Song, providedQueue?: Models.Song[]): Promise<void> {
    try {
      this.wantsToPlay = true;

      this.notify({
        status: "loading",
        currentSong: song,
      });

      const fullQueue = await queueService.setQueue(song, providedQueue);
      const tracks = await Promise.all(fullQueue.map((s) => this.prepareTrack(s)));
      const validTracks = tracks.filter((t): t is TrackItem => t !== null);

      if (validTracks.length === 0) {
        throw new Error("No valid tracks");
      }

      if (this.currentPlaylistId) {
        await PlayerQueue.deletePlaylist(this.currentPlaylistId);
      }

      this.currentPlaylistId = await PlayerQueue.createPlaylist(
        song.title || "Now Playing",
        "",
        song.images?.[2]?.url || song.images?.[1]?.url || undefined,
      );

      await PlayerQueue.addTracksToPlaylist(this.currentPlaylistId, validTracks);
      await PlayerQueue.loadPlaylist(this.currentPlaylistId);
      await TrackPlayer.playSong(song.id, this.currentPlaylistId);

      this.notify({
        upcomingTracks: fullQueue.slice(1),
      });
    } catch (error) {
      console.error("[Player] Play failed:", error);
    }
  }

  async resume(): Promise<void> {
    this.wantsToPlay = true;
    await TrackPlayer.play();
  }

  async restoreLastPlayedTrack(
    currentSong: Models.Song | null,
    progress: number,
  ): Promise<void> {
    if (!currentSong) return;

    try {
      const fullQueue = await queueService.setQueue(currentSong);
      const tracks = await Promise.all(fullQueue.map((s) => this.prepareTrack(s)));
      const validTracks = tracks.filter((t): t is TrackItem => t !== null);

      if (validTracks.length === 0) {
        throw new Error("No valid tracks prepared");
      }

      if (this.currentPlaylistId) {
        await PlayerQueue.deletePlaylist(this.currentPlaylistId);
      }

      this.currentPlaylistId = await PlayerQueue.createPlaylist(
        currentSong.title || "Now Playing",
        "",
        currentSong.images?.[2]?.url || currentSong.images?.[1]?.url || undefined,
      );

      await PlayerQueue.addTracksToPlaylist(this.currentPlaylistId, validTracks);
      await PlayerQueue.loadPlaylist(this.currentPlaylistId);
      await TrackPlayer.playSong(currentSong.id, this.currentPlaylistId);

      if (progress > 0) {
        await TrackPlayer.seek(progress / 1000);
      }

      await TrackPlayer.pause();
      this.wantsToPlay = false;

      this.notify({
        currentSong,
        upcomingTracks: fullQueue.slice(1),
        status: "paused",
        progress,
        duration: currentSong.duration ? currentSong.duration * 1000 : 0,
      });
    } catch (error) {
      console.error("[Player] Restore track failed:", error);
    }
  }

  async pause(): Promise<void> {
    this.wantsToPlay = false;
    await TrackPlayer.pause();
  }

  async togglePlayPause(): Promise<void> {
    this.wantsToPlay = !this.wantsToPlay;
    if (this.wantsToPlay) {
      await this.resume();
    } else {
      await this.pause();
    }
  }

  async next(): Promise<void> {
    try {
      const queue = await TrackPlayer.getActualQueue();
      const state = await TrackPlayer.getState();

      if (state.currentIndex >= queue.length - 1) {
        const qState = queueService.getState();

        if (qState.currentSong?.id) {
          const extended = await this.maybeExtendQueue(qState.currentSong.id);
          if (extended) {
            await TrackPlayer.skipToNext();
            return;
          }
        }

        if (qState.repeatMode === "all" && queue.length > 0) {
          await TrackPlayer.skipToIndex(0);
        }
        return;
      }

      await TrackPlayer.skipToNext();
    } catch (error) {
      console.error("[Player] Next failed:", error);
    }
  }

  async previous(): Promise<void> {
    try {
      const state = await TrackPlayer.getState();

      if (state.currentPosition > 3) {
        await TrackPlayer.seek(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    } catch (error) {
      console.error("[Player] Previous failed:", error);
    }
  }

  async seekTo(positionMs: number): Promise<void> {
    await TrackPlayer.seek(positionMs / 1000);
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    queueService.setRepeatMode(mode);
    await TrackPlayer.setRepeatMode(this.mapRepeatMode(mode));
    this.notify({ repeatMode: mode });
  }

  async stop(): Promise<void> {
    this.wantsToPlay = false;

    if (this.currentPlaylistId) {
      await PlayerQueue.deletePlaylist(this.currentPlaylistId);
      this.currentPlaylistId = null;
    }

    queueService.clear();

    this.notify({
      status: "loading",
      currentSong: null,
      upcomingTracks: [],
      progress: 0,
      duration: 0,
    });
  }

  async addToQueue(song: Models.Song): Promise<void> {
    try {
      const track = await this.prepareTrack(song);
      if (!track) throw new Error("Failed to prepare track");

      if (this.currentPlaylistId) {
        await PlayerQueue.addTrackToPlaylist(this.currentPlaylistId, track);
      }

      await TrackPlayer.addToUpNext(song.id);
      queueService.addToQueue(song);
    } catch (error) {
      console.error("[Player] Add to queue failed:", error);
    }
  }

  async addNextInQueue(song: Models.Song): Promise<void> {
    try {
      const track = await this.prepareTrack(song);
      if (!track) throw new Error("Failed to prepare track");

      if (this.currentPlaylistId) {
        await PlayerQueue.addTrackToPlaylist(this.currentPlaylistId, track);
      }

      await TrackPlayer.playNext(song.id);
      queueService.addNextInQueue(song);
    } catch (error) {
      console.error("[Player] Add next in queue failed:", error);
    }
  }

  private async prepareTrack(song: Models.Song): Promise<TrackItem | null> {
    try {
      const downloadInfo = await downloadService.getDownloadInfo(song.id);

      let url: string;

      if (downloadInfo) {
        url = `file://${downloadInfo.filePath}`;
      } else {
        const encrypted =
          song.media?.encryptedUrl ||
          (await Song.getById({ songIds: song.id })).songs[0]?.media?.encryptedUrl;

        if (!encrypted) throw new Error("No encrypted URL");

        const urls = await Song.experimental.fetchStreamUrls(encrypted, "edge", true);

        const quality =
          (await appStorage.getItem(STORAGE_KEYS.CONTENT_QUALITY)) || "medium";
        const idx =
          AUDIO_QUALITY[quality.toUpperCase() as keyof typeof AUDIO_QUALITY] ||
          AUDIO_QUALITY.MEDIUM;

        const streamUrl = urls[idx].url;
        if (!streamUrl) throw new Error("No streaming URL");

        url = streamUrl;
      }

      const artist = song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
      const album =
        typeof song.album === "string" ? song.album : song.album?.title || "";
      const artwork = song.images?.[2]?.url || song.images?.[1]?.url || "";

      return {
        id: song.id,
        url,
        title: song.title || "Unknown",
        artist,
        album,
        artwork: artwork || null,
        duration: song.duration || 0,
      };
    } catch (error) {
      console.error("[Player] Failed to prepare track:", song.title, error);
      return null;
    }
  }

  private async maybeExtendQueue(seedSongId: string): Promise<boolean> {
    try {
      const newSongs = await queueService.extendQueue(seedSongId);

      if (newSongs.length === 0) return false;

      const tracks = await Promise.all(newSongs.map((s) => this.prepareTrack(s)));
      const validTracks = tracks.filter((t): t is TrackItem => t !== null);

      if (validTracks.length === 0) return false;

      if (this.currentPlaylistId) {
        await PlayerQueue.addTracksToPlaylist(this.currentPlaylistId, validTracks);
      }

      this.notify({
        upcomingTracks: queueService.getState().upcomingTracks,
      });

      return true;
    } catch (error) {
      console.error("[Player] Extend queue failed:", error);
      return false;
    }
  }

  private mapRepeatMode(mode: RepeatMode): "off" | "track" | "Playlist" {
    switch (mode) {
      case "off":
        return "off";
      case "one":
        return "track";
      case "all":
        return "Playlist";
    }
  }

  private notify(updates: Partial<PlayerState>): void {
    this.stateUpdater?.(updates);
  }
}

export const playerService = new PlayerService();