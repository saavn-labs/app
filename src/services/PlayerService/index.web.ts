import { AUDIO_QUALITY, STORAGE_KEYS } from "@/constants";
import { downloadService } from "@/services/DownloadService";
import { appStorage } from "@/stores/storage";
import { PlayerStatus, RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import { queueService } from "../QueueService";
import { IPlayerService, PlayerState, StateUpdater } from "./index.types";

export class PlayerService implements IPlayerService {
  private stateUpdater: StateUpdater | null = null;
  private isInitialized = false;
  private lastStatus: PlayerStatus | null = null;
  private wantsToPlay = false;
  private audio: HTMLAudioElement | null = null;
  private queue: Models.Song[] = [];
  private currentIndex = 0;
  private progressInterval: number | null = null;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === "undefined") {
      return;
    }

    this.audio = new Audio();
    this.setupAudioListeners();
    this.setupMediaSession();
    this.isInitialized = true;
  }

  setStateUpdater(updater: StateUpdater): void {
    this.stateUpdater = updater;
  }

  private setupAudioListeners(): void {
    if (!this.audio) return;

    this.audio.addEventListener("play", () => {
      this.updateStatus("playing");
      this.startProgressTracking();
    });

    this.audio.addEventListener("pause", () => {
      this.updateStatus("paused");
      this.stopProgressTracking();
    });

    this.audio.addEventListener("waiting", () => {
      this.updateStatus("loading");
    });

    this.audio.addEventListener("canplay", () => {
      if (this.wantsToPlay) {
        this.updateStatus("playing");
      }
    });

    this.audio.addEventListener("ended", async () => {
      await this.handleTrackEnded();
    });

    this.audio.addEventListener("loadedmetadata", () => {
      this.notify({
        duration: (this.audio?.duration || 0) * 1000,
      });
    });

    this.audio.addEventListener("error", (e) => {
      console.error("[Player] Audio error:", e);
      this.updateStatus("paused");
    });
  }

  private setupMediaSession(): void {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => this.resume());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      this.previous(),
    );
    navigator.mediaSession.setActionHandler("nexttrack", () => this.next());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        this.seekTo(details.seekTime * 1000);
      }
    });
  }

  private updateMediaSessionMetadata(song: Models.Song): void {
    if (!("mediaSession" in navigator)) return;

    const artist =
      song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
    const album =
      typeof song.album === "string" ? song.album : song.album?.title || "";
    const artwork = song.images?.[2]?.url || song.images?.[1]?.url || "";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || "Unknown",
      artist,
      album,
      artwork: artwork
        ? [{ src: artwork, sizes: "500x500", type: "image/jpeg" }]
        : [],
    });
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (this.audio) {
        this.notify({
          progress: this.audio.currentTime * 1000,
          duration: this.audio.duration * 1000,
        });

        if (
          "mediaSession" in navigator &&
          navigator.mediaSession.setPositionState
        ) {
          try {
            navigator.mediaSession.setPositionState({
              duration: this.audio.duration,
              playbackRate: this.audio.playbackRate,
              position: this.audio.currentTime,
            });
          } catch (e) {
            console.error("[Player] MediaSession position state error:", e);
          }
        }
      }
    }, 1000);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async play(song: Models.Song, providedQueue?: Models.Song[]): Promise<void> {
    try {
      this.wantsToPlay = true;

      this.notify({
        status: "loading",
        currentSong: song,
      });

      const fullQueue = await queueService.setQueue(song, providedQueue);
      this.queue = fullQueue;
      this.currentIndex = 0;

      await this.loadAndPlayTrack(song);

      this.notify({
        upcomingTracks: fullQueue.slice(1),
      });
    } catch (error) {
      console.error("[Player] Play failed:", error);
    }
  }

  private async loadAndPlayTrack(song: Models.Song): Promise<void> {
    if (!this.audio) return;

    try {
      const url = await this.getTrackUrl(song);

      this.audio.src = url;
      this.audio.load();

      this.updateMediaSessionMetadata(song);

      this.notify({
        currentSong: song,
        status: "loading",
        progress: 0,
        duration: song.duration ? song.duration * 1000 : 0,
      });

      await this.audio.play();

      if (this.currentIndex >= this.queue.length - 2) {
        await this.maybeExtendQueue(song.id);
      }
    } catch (error) {
      console.error("[Player] Failed to load track:", error);
      this.updateStatus("paused");
    }
  }

  private async getTrackUrl(song: Models.Song): Promise<string> {
    const downloadInfo = await downloadService.getDownloadInfo(song.id);

    if (downloadInfo) {
      return downloadInfo.filePath;
    }

    const encrypted =
      song.media?.encryptedUrl ||
      (await Song.getById({ songIds: song.id })).songs[0]?.media?.encryptedUrl;

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

    return streamUrl;
  }

  async resume(): Promise<void> {
    if (!this.audio) return;
    this.wantsToPlay = true;
    try {
      await this.audio.play();
    } catch (error) {
      console.error("[Player] Resume failed:", error);
    }
  }

  async restoreLastPlayedTrack(
    currentSong: Models.Song | null,
    progress: number,
  ): Promise<void> {
    if (!currentSong || !this.audio) return;

    try {
      const fullQueue = await queueService.setQueue(currentSong);
      this.queue = fullQueue;
      this.currentIndex = 0;

      const url = await this.getTrackUrl(currentSong);
      this.audio.src = url;
      this.audio.load();

      if (progress > 0) {
        this.audio.currentTime = progress / 1000;
      }

      this.updateMediaSessionMetadata(currentSong);

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
    if (!this.audio) return;
    this.wantsToPlay = false;
    this.audio.pause();
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
      if (this.currentIndex >= this.queue.length - 1) {
        const state = queueService.getState();

        if (state.currentSong?.id) {
          const extended = await this.maybeExtendQueue(state.currentSong.id);

          if (extended) {
            this.currentIndex++;
            await this.loadAndPlayTrack(this.queue[this.currentIndex]);
            return;
          }
        }

        if (state.repeatMode === "all" && this.queue.length > 0) {
          this.currentIndex = 0;
          await this.loadAndPlayTrack(this.queue[0]);
        }
        return;
      }

      this.currentIndex++;
      const nextSong = this.queue[this.currentIndex];
      queueService.onTrackChanged(nextSong.id);
      await this.loadAndPlayTrack(nextSong);
    } catch (error) {
      console.error("[Player] Next failed:", error);
    }
  }

  async previous(): Promise<void> {
    try {
      if (!this.audio) return;

      if (this.audio.currentTime > 3) {
        await this.seekTo(0);
      } else if (this.currentIndex > 0) {
        this.currentIndex--;
        const prevSong = this.queue[this.currentIndex];
        queueService.onTrackChanged(prevSong.id);
        await this.loadAndPlayTrack(prevSong);
      }
    } catch (error) {
      console.error("[Player] Previous failed:", error);
    }
  }

  async seekTo(positionMs: number): Promise<void> {
    if (!this.audio) return;
    this.audio.currentTime = positionMs / 1000;
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    queueService.setRepeatMode(mode);
    this.notify({ repeatMode: mode });
  }

  async stop(): Promise<void> {
    this.wantsToPlay = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    this.stopProgressTracking();
    this.queue = [];
    this.currentIndex = 0;
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
      this.queue.push(song);
      queueService.addToQueue(song);
    } catch (error) {
      console.error("[Player] Add to queue failed:", error);
    }
  }

  async addNextInQueue(song: Models.Song): Promise<void> {
    try {
      const insertIndex = this.currentIndex + 1;
      this.queue.splice(insertIndex, 0, song);
      queueService.addNextInQueue(song);
    } catch (error) {
      console.error("[Player] Add next in queue failed:", error);
    }
  }

  private async handleTrackEnded(): Promise<void> {
    const state = queueService.getState();

    if (state.repeatMode === "one") {
      await this.seekTo(0);
      await this.resume();
      return;
    }

    if (this.currentIndex < this.queue.length - 1) {
      await this.next();
    } else if (state.repeatMode === "all") {
      this.currentIndex = 0;
      await this.loadAndPlayTrack(this.queue[0]);
    } else {
      this.updateStatus("paused");
    }
  }

  private async maybeExtendQueue(seedSongId: string): Promise<boolean> {
    try {
      const newTracks = await queueService.extendQueue(seedSongId);

      if (newTracks.length === 0) return false;

      this.queue.push(...newTracks);

      this.notify({
        upcomingTracks: queueService.getState().upcomingTracks,
      });

      return true;
    } catch (error) {
      console.error("[Player] Extend queue failed:", error);
      return false;
    }
  }

  private updateStatus(status: PlayerStatus): void {
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      this.notify({ status });
    }
  }

  private notify(updates: Partial<PlayerState>): void {
    this.stateUpdater?.(updates);
  }
}

export const playerService = new PlayerService();
export type { PlayerState } from "./index.types";
