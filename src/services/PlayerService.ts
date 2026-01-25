import { appStorage } from "@/stores/storage";
import { PlayerStatus, RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import TrackPlayer, {
  Event,
  RepeatMode as RNTPRepeatMode,
  State,
  Track,
} from "react-native-track-player";
import { AUDIO_QUALITY, STORAGE_KEYS } from "../constants";
import { queueService } from "./QueueService";

/**
 * PlayerService - RNTP as Single Source of Truth
 *
 * PRINCIPLES:
 * 1. RNTP owns the queue and playback state
 * 2. JS prepares tracks and listens to RNTP events
 * 3. Track by song.id for sync (RNTP track.id === song.id)
 * 4. No duplicate queue management - RNTP is the authority
 */

export interface PlayerState {
  status: PlayerStatus;
  currentSong: Models.Song | null;
  upcomingTracks: Models.Song[];
  progress: number;
  duration: number;
  repeatMode: RepeatMode;
}

type StateUpdater = (updates: Partial<PlayerState>) => void;

export class PlayerService {
  private stateUpdater: StateUpdater | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("[Player] Initializing...");
    this.setupEventListeners();
    this.isInitialized = true;
  }

  setStateUpdater(updater: StateUpdater): void {
    this.stateUpdater = updater;
  }

  private setupEventListeners(): void {
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
      const status = this.mapState(event.state);
      this.notify({ status });
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
            status: "playing",
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
        this.notify({ status: "idle" });
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
      console.error("[Player] ❌ Error:", event);
    });
  }

  /**
   * Play a song with optional queue
   */
  async play(song: Models.Song, providedQueue?: Models.Song[]): Promise<void> {
    try {
      console.log("[Player] Playing:", song.title);
      this.notify({ status: "loading" });

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
        currentSong: song,
        upcomingTracks: fullQueue.slice(1),
      });
    } catch (e) {
      console.error("[Player] Play failed:", e);
      this.notify({ status: "error" });
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    await TrackPlayer.play();
  }

  /**
   * Restore last played track with saved position
   * Called on app startup to resume from where user left off
   */
  async restoreLastPlayedTrack(
    currentSong: Models.Song | null,
    progress: number,
  ): Promise<void> {
    if (!currentSong) return;

    try {
      console.log("[Player] Restoring last played track:", currentSong.title);

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

      console.log(
        "[Player] ✅ Restored track at position:",
        (progress / 1000).toFixed(2),
        "s with queue of",
        validTracks.length,
        "tracks",
      );
    } catch (e) {
      console.error("[Player] Restore track failed:", e);
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    await TrackPlayer.pause();
  }

  /**
   * Toggle play/pause
   */
  async togglePlayPause(): Promise<void> {
    const state = await TrackPlayer.getPlaybackState();

    if (state.state === State.Playing) {
      await this.pause();
    } else {
      await this.resume();
    }
  }

  /**
   * Skip to next track
   */
  async next(): Promise<void> {
    try {
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
    } catch (e) {
      console.error("[Player] Next failed:", e);
    }
  }

  /**
   * Skip to previous track (or restart if >3s)
   */
  async previous(): Promise<void> {
    try {
      const position = await TrackPlayer.getProgress();

      if (position.position > 3) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    } catch (e) {
      console.error("[Player] Previous failed:", e);
    }
  }

  /**
   * Seek to position (milliseconds)
   */
  async seekTo(positionMs: number): Promise<void> {
    await TrackPlayer.seekTo(positionMs / 1000);
  }

  /**
   * Set repeat mode
   */
  async setRepeatMode(mode: RepeatMode): Promise<void> {
    queueService.setRepeatMode(mode);
    await TrackPlayer.setRepeatMode(this.mapRepeatMode(mode));
    this.notify({ repeatMode: mode });
  }

  /**
   * Stop and clear
   */
  async stop(): Promise<void> {
    await TrackPlayer.reset();
    queueService.clear();
    this.notify({
      status: "idle",
      currentSong: null,
      upcomingTracks: [],
      progress: 0,
      duration: 0,
    });
  }

  /**
   * Add song to end of queue
   */
  async addToQueue(song: Models.Song): Promise<void> {
    try {
      const track = await this.prepareTrack(song);
      if (!track) {
        throw new Error("Failed to prepare track");
      }

      await TrackPlayer.add([track]);
      queueService.addToQueue(song);

      console.log("[Player] ✅ Added to queue:", song.title);
    } catch (e) {
      console.error("[Player] Add to queue failed:", e);
    }
  }

  /**
   * Add song to play next (after current track)
   */
  async addNextInQueue(song: Models.Song): Promise<void> {
    try {
      const track = await this.prepareTrack(song);
      if (!track) {
        throw new Error("Failed to prepare track");
      }

      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      const insertIndex = currentIndex !== undefined ? currentIndex + 1 : 0;

      await TrackPlayer.add([track], insertIndex);
      queueService.addNextInQueue(song);

      console.log("[Player] ✅ Added next in queue:", song.title);
    } catch (e) {
      console.error("[Player] Add next in queue failed:", e);
    }
  }

  /**
   * Prepare a Track for RNTP
   * CRITICAL: track.id MUST be song.id for sync to work
   */
  private async prepareTrack(song: Models.Song): Promise<Track | null> {
    try {
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
      const url = urls[idx].url;

      if (!url) throw new Error("No streaming URL");

      const artist =
        song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
      const album =
        typeof song.album === "string" ? song.album : song.album?.title || "";
      const artwork = song.images?.[2]?.url || song.images?.[0]?.url || "";

      return {
        id: song.id,
        url,
        title: song.title || "Unknown",
        artist,
        album,
        artwork: artwork || undefined,
        duration: song.duration || undefined,
      };
    } catch (e) {
      console.error("[Player] Failed to prepare track:", song.title, e);
      return null;
    }
  }

  /**
   * Extend queue if needed (when approaching end)
   */
  private async maybeExtendQueue(seedSongId: string): Promise<boolean> {
    try {
      const newTracks = await queueService.extendQueue(seedSongId);

      if (newTracks.length === 0) return false;

      const tracks = await Promise.all(
        newTracks.map((s) => this.prepareTrack(s)),
      );

      const validTracks = tracks.filter((t): t is Track => t !== null);

      if (validTracks.length > 0) {
        await TrackPlayer.add(validTracks);
        console.log(
          "[Player] ✅ Extended queue with",
          validTracks.length,
          "tracks",
        );

        this.notify({
          upcomingTracks: queueService.getState().upcomingTracks,
        });

        return true;
      }

      return false;
    } catch (e) {
      console.error("[Player] Extend queue failed:", e);
      return false;
    }
  }

  /**
   * Map state
   */
  private mapState(state: State): PlayerStatus {
    switch (state) {
      case State.Playing:
        return "playing";
      case State.Paused:
      case State.Stopped:
        return "paused";
      case State.Buffering:
      case State.Loading:
        return "loading";
      default:
        return "idle";
    }
  }

  /**
   * Map repeat mode
   */
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

  /**
   * Notify state changes
   */
  private notify(updates: Partial<PlayerState>): void {
    this.stateUpdater?.(updates);
  }
}

export const playerService = new PlayerService();
