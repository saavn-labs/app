import { AUDIO_QUALITY, STORAGE_KEYS } from "@/constants";
import { downloadService } from "@/services/DownloadService";
import { appStorage } from "@/stores/storage";
import { PlayerStatus, RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import TrackPlayer, {
  AndroidAudioContentType,
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode as RNTPRepeatMode,
  State,
  Track,
} from "react-native-track-player";
import { queueService } from "../QueueService";
import { IPlayerService, PlayerState, StateUpdater } from "./index.types";

export class PlayerService implements IPlayerService {
  private stateUpdater: StateUpdater | null = null;
  private isInitialized = false;
  private lastStatus: PlayerStatus | null = null;
  private wantsToPlay = false;
  private playerReadyPromise: Promise<void> | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.ensurePlayerReady();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  private async ensurePlayerReady(): Promise<void> {
    if (this.playerReadyPromise) return this.playerReadyPromise;

    this.playerReadyPromise = (async () => {
      try {
        await TrackPlayer.getActiveTrackIndex();
      } catch (error: any) {
        if (error?.code === "player_not_initialized") {
          await TrackPlayer.setupPlayer({
            autoHandleInterruptions: true,
            androidAudioContentType: AndroidAudioContentType.Music,
          });

          await TrackPlayer.updateOptions({
            progressUpdateEventInterval: 1,
            android: {
              appKilledPlaybackBehavior:
                AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
              alwaysPauseOnInterruption: true,
              androidSkipSilence: true,
            },
            capabilities: [
              Capability.Play,
              Capability.Pause,
              Capability.Stop,
              Capability.SeekTo,
              Capability.SkipToNext,
              Capability.SkipToPrevious,
            ],
            notificationCapabilities: [
              Capability.Play,
              Capability.Pause,
              Capability.SkipToNext,
              Capability.SkipToPrevious,
            ],
          });
        }
      }
    })();

    return this.playerReadyPromise;
  }

  setStateUpdater(updater: StateUpdater): void {
    this.stateUpdater = updater;
  }

  private setupEventListeners(): void {
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
      const status = this.mapState(event.state);

      if (status !== this.lastStatus) {
        this.lastStatus = status;
        this.notify({ status });
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
      this.notify({
        progress: event.position * 1000,
        duration: event.duration * 1000,
      });
    });

    TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (!event.track) return;

        const song = queueService.getSongById(event.track.id);

        if (song) {
          queueService.onTrackChanged(event.track.id);

          this.notify({
            currentSong: song,
            status: "paused",
            progress: 0,
            duration: song.duration ? song.duration * 1000 : 0,
          });

          const queue = await TrackPlayer.getQueue();
          const currentIndex = await TrackPlayer.getActiveTrackIndex();

          if (currentIndex !== undefined && currentIndex >= queue.length - 2) {
            await this.maybeExtendQueue(song.id);
          }
        }
      },
    );

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      const state = queueService.getState();
      if (state.repeatMode === "all") {
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
      } else {
        this.notify({ status: "loading" });
      }
    });
  }

  async play(song: Models.Song, providedQueue?: Models.Song[]): Promise<void> {
    try {
      await this.ensurePlayerReady();
      this.wantsToPlay = true;

      this.notify({
        status: "loading",
        currentSong: song,
      });

      const fullQueue = await queueService.setQueue(song, providedQueue);

      const tracks = await Promise.all(
        fullQueue.map((s) => this.prepareTrack(s)),
      );

      const validTracks = tracks.filter((t): t is Track => t !== null);

      if (validTracks.length === 0) {
        throw new Error("No valid tracks");
      }

      await TrackPlayer.reset();
      await TrackPlayer.add(validTracks);

      await TrackPlayer.skip(0);
      await TrackPlayer.play();

      this.notify({
        upcomingTracks: fullQueue.slice(1),
      });
    } catch (error) {
      console.error("[Player] Play failed:", error);
    }
  }

  async resume(): Promise<void> {
    await this.ensurePlayerReady();
    this.wantsToPlay = true;
    await TrackPlayer.play();
  }

  async restoreLastPlayedTrack(
    currentSong: Models.Song | null,
    progress: number,
  ): Promise<void> {
    if (!currentSong) return;

    try {
      await this.ensurePlayerReady();
      const fullQueue = await queueService.setQueue(currentSong);

      const tracks = await Promise.all(
        fullQueue.map((s) => this.prepareTrack(s)),
      );

      const validTracks = tracks.filter((t): t is Track => t !== null);

      if (validTracks.length === 0) {
        throw new Error("No valid tracks prepared");
      }

      await TrackPlayer.reset();
      await TrackPlayer.add(validTracks);
      await TrackPlayer.skip(0);

      if (progress > 0) {
        await TrackPlayer.seekTo(progress / 1000);
      }

      this.notify({
        currentSong,
        upcomingTracks: fullQueue.slice(1),
        status: "paused",
        progress: progress,
        duration: currentSong.duration ? currentSong.duration * 1000 : 0,
      });
    } catch (error) {
      console.error("[Player] Restore track failed:", error);
    }
  }

  async pause(): Promise<void> {
    await this.ensurePlayerReady();
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
      await this.ensurePlayerReady();
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      if (currentIndex === undefined) return;

      if (currentIndex >= queue.length - 1) {
        const state = queueService.getState();

        if (state.currentSong?.id) {
          const extended = await this.maybeExtendQueue(state.currentSong.id);

          if (extended) {
            await TrackPlayer.skipToNext();
            return;
          }
        }

        if (state.repeatMode === "all" && queue.length > 0) {
          await TrackPlayer.skip(0);
          await TrackPlayer.play();
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
      await this.ensurePlayerReady();
      const position = await TrackPlayer.getProgress();

      if (position.position > 3) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    } catch (error) {
      console.error("[Player] Previous failed:", error);
    }
  }

  async seekTo(positionMs: number): Promise<void> {
    await this.ensurePlayerReady();
    await TrackPlayer.seekTo(positionMs / 1000);
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    await this.ensurePlayerReady();
    queueService.setRepeatMode(mode);
    await TrackPlayer.setRepeatMode(this.mapRepeatMode(mode));
    this.notify({ repeatMode: mode });
  }

  async stop(): Promise<void> {
    await this.ensurePlayerReady();
    this.wantsToPlay = false;
    await TrackPlayer.reset();
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
      await this.ensurePlayerReady();
      const track = await this.prepareTrack(song);
      if (!track) {
        throw new Error("Failed to prepare track");
      }

      await TrackPlayer.add([track]);
      queueService.addToQueue(song);
    } catch (error) {
      console.error("[Player] Add to queue failed:", error);
    }
  }

  async addNextInQueue(song: Models.Song): Promise<void> {
    try {
      await this.ensurePlayerReady();
      const track = await this.prepareTrack(song);
      if (!track) {
        throw new Error("Failed to prepare track");
      }

      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      const insertIndex = currentIndex !== undefined ? currentIndex + 1 : 0;

      await TrackPlayer.add([track], insertIndex);
      queueService.addNextInQueue(song);
    } catch (error) {
      console.error("[Player] Add next in queue failed:", error);
    }
  }

  private async prepareTrack(song: Models.Song): Promise<Track | null> {
    try {
      const downloadInfo = await downloadService.getDownloadInfo(song.id);

      let url: string;

      if (downloadInfo) {
        url = `file://${downloadInfo.filePath}`;
      } else {
        const encrypted =
          song.media?.encryptedUrl ||
          (await Song.getById({ songIds: song.id })).songs[0]?.media
            ?.encryptedUrl;

        if (!encrypted) throw new Error("No encrypted URL");

        const urls = await Song.experimental.fetchStreamUrls(
          encrypted,
          "edge",
          true,
        );

        const quality =
          (await appStorage.getItem(STORAGE_KEYS.CONTENT_QUALITY)) || "medium";
        const idx =
          AUDIO_QUALITY[quality.toUpperCase() as keyof typeof AUDIO_QUALITY] ||
          AUDIO_QUALITY.MEDIUM;

        const streamUrl = urls[idx].url;
        if (!streamUrl) throw new Error("No streaming URL");

        url = streamUrl;
      }

      const artist =
        song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
      const album =
        typeof song.album === "string" ? song.album : song.album?.title || "";
      const artwork = song.images?.[2]?.url || song.images?.[1]?.url || "";

      return {
        id: song.id,
        url,
        title: song.title || "Unknown",
        artist,
        album,
        artwork: artwork || undefined,
        duration: song.duration || undefined,
      };
    } catch (error) {
      console.error("[Player] Failed to prepare track:", song.title, error);
      return null;
    }
  }

  private async maybeExtendQueue(seedSongId: string): Promise<boolean> {
    try {
      await this.ensurePlayerReady();
      const newTracks = await queueService.extendQueue(seedSongId);

      if (newTracks.length === 0) return false;

      const tracks = await Promise.all(
        newTracks.map((s) => this.prepareTrack(s)),
      );

      const validTracks = tracks.filter((t): t is Track => t !== null);

      if (validTracks.length > 0) {
        await TrackPlayer.add(validTracks);

        this.notify({
          upcomingTracks: queueService.getState().upcomingTracks,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error("[Player] Extend queue failed:", error);
      return false;
    }
  }

  private mapState(state: State): PlayerStatus {
    if (!this.wantsToPlay) return "paused";
    if (state === State.Playing) return "playing";

    return "loading";
  }

  private mapRepeatMode(mode: RepeatMode): RNTPRepeatMode {
    switch (mode) {
      case "off":
        return RNTPRepeatMode.Off;
      case "one":
        return RNTPRepeatMode.Track;
      case "all":
        return RNTPRepeatMode.Queue;
    }
  }

  private notify(updates: Partial<PlayerState>): void {
    this.stateUpdater?.(updates);
  }
}

export const playerService = new PlayerService();
export type { PlayerState } from "./index.types";
