import { PlayerStatus, RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import { audioService, AudioService } from "./AudioService";
import { historyService } from "./HistoryService";
import { mediaSessionService } from "./MediaSessionService";
import { playerStateService } from "./PlayerStateService";
import { queueService, QueueService } from "./QueueService";

export interface PlayerState {
  status: PlayerStatus;
  currentSong: Models.Song | null;
  currentIndex: number;
  queue: Models.Song[];
  progress: number;
  duration: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  error: string | null;
}

type PlayerListener = (state: PlayerState) => void;

export class PlayerService {
  private audioService: AudioService;
  private queueService: QueueService;
  private listeners: Set<PlayerListener> = new Set();
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private state: PlayerState = {
    status: "idle",
    currentSong: null,
    currentIndex: -1,
    queue: [],
    progress: 0,
    duration: 0,
    isShuffled: false,
    repeatMode: "off",
    error: null,
  };

  constructor(audioService: AudioService, queueService: QueueService) {
    this.audioService = audioService;
    this.queueService = queueService;

    mediaSessionService.initialize({
      onPlay: () => this.play(),
      onPause: () => this.pause(),
      onPlayPause: () => this.togglePlayPause(),
      onNext: () => this.playNext(),
      onPrevious: () => this.playPrevious(),
      onSeek: (position) => this.seekTo(position),
    });
  }

  subscribe(listener: PlayerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private updateState(updates: Partial<PlayerState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private startProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      try {
        if (this.audioService.isPlaying()) {
          const progress = this.audioService.getCurrentTime();
          const duration = this.audioService.getDuration();

          const progressChanged =
            Math.abs(this.state.progress - progress) > 0.5;
          const durationChanged =
            Math.abs(this.state.duration - duration) > 0.1;

          if (progressChanged || durationChanged) {
            this.updateState({ progress, duration });
          }

          if (this.state.currentSong && progressChanged) {
            playerStateService.savePlayerState(
              this.state.currentSong,
              progress,
            );
          }

          if (this.state.currentSong) {
            mediaSessionService.updateNowPlaying(
              this.state.currentSong,
              "",
              true,
              progress,
              duration,
            );
          }

          if (duration > 0 && progress >= duration - 0.5) {
            this.playNext();
          }
        }
      } catch (error) {
        console.error("Error in progress tracking:", error);
        this.stopProgressTracking();
      }
    }, 500) as number;
  }

  private stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async playSong(
    song: Models.Song,
    queue?: Models.Song[],
    startIndex?: number,
  ) {
    try {
      if (!song.id) {
        throw new Error("Cannot play song without ID");
      }

      this.updateState({ status: "loading", error: null });

      if (queue && queue.length > 0) {
        const index = startIndex ?? queue.findIndex((s) => s.id === song.id);
        this.queueService.setQueue(queue, index >= 0 ? index : 0);
      } else {
        const playedSongs = this.queueService.getPlayedSongs();
        const recommendations = await this.queueService.fetchRecommendations(
          song.id,
          true,
        );
        this.queueService.setQueue([song, ...recommendations], 0, playedSongs);
      }

      await this.loadAndPlaySong(song);
    } catch (error) {
      this.handlePlayError(error);
    }
  }

  private async loadAndPlaySong(song: Models.Song) {
    let encryptedUrl = song.media?.encryptedUrl;

    if (!song.media?.encryptedUrl) {
      const songDetail = await Song.getById({ songIds: song.id });
      encryptedUrl = songDetail.songs[0]?.media?.encryptedUrl;
    }

    if (!encryptedUrl) {
      throw new Error("No encrypted URL found for the song");
    }

    const streamUrl = await Song.experimental
      .fetchStreamUrls(encryptedUrl, "edge", true)
      .then((urls) => urls[2].url);

    if (!streamUrl) {
      throw new Error("No streaming URL available");
    }

    await this.audioService.loadAndPlayWithPreload(streamUrl, song.id);
    const duration = this.audioService.getDuration();

    await mediaSessionService.updateNowPlaying(
      song,
      streamUrl,
      true,
      0,
      duration,
    );

    this.updateState({
      status: "playing",
      currentSong: song,
      currentIndex: this.queueService.getCurrentIndex(),
      queue: this.queueService.getQueue(),
      progress: 0,
      duration: this.audioService.getDuration(),
    });

    this.startProgressTracking();

    setTimeout(() => {
      historyService.addToHistory(song, duration);
      playerStateService.savePlayerState(song, 0);
    }, 1000);
  }

  private handlePlayError(error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to play song";
    console.error("Error playing song:", error);
    this.updateState({
      status: "error",
      error: message,
    });
  }

  getUpNext(limit: number = 5): Models.Song[] {
    return this.queueService.getUpNext(limit);
  }

  async play() {
    if (this.state.status === "paused" || this.state.status === "idle") {
      if (this.state.currentSong) {
        await this.audioService.play();
        await mediaSessionService.updatePlaybackState(
          true,
          this.state.progress,
        );

        await mediaSessionService.updateNowPlaying(
          this.state.currentSong,
          "",
          true,
          this.state.progress,
          this.state.duration,
        );

        this.updateState({ status: "playing" });
        this.startProgressTracking();
      } else if (this.queueService.getQueue().length > 0) {
        const song = this.queueService.getCurrentSong();
        if (song) {
          await this.playSong(
            song,
            this.queueService.getQueue(),
            this.queueService.getCurrentIndex(),
          );
        }
      }
    }
  }

  async pause() {
    if (this.state.status === "playing") {
      await this.audioService.pause();
      await mediaSessionService.updatePlaybackState(false, this.state.progress);

      if (this.state.currentSong) {
        await mediaSessionService.updateNowPlaying(
          this.state.currentSong,
          "",
          false,
          this.state.progress,
          this.state.duration,
        );
      }

      this.updateState({ status: "paused" });
      this.stopProgressTracking();

      if (this.state.currentSong) {
        await playerStateService.savePlayerState(
          this.state.currentSong,
          this.state.progress,
        );
      }
    }
  }

  async togglePlayPause() {
    if (this.state.status === "playing") {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async playNext() {
    const isLastOrOnlySong =
      this.queueService.getCurrentIndex() >=
      this.queueService.getQueue().length - 1;

    if (isLastOrOnlySong && this.state.currentSong) {
      try {
        const recommendations = await this.queueService.fetchRecommendations(
          this.state.currentSong.id,
          true,
        );

        if (recommendations.length > 0) {
          this.queueService.appendQueue(recommendations);
          this.updateState({
            queue: this.queueService.getQueue(),
            currentIndex: this.queueService.getCurrentIndex(),
          });
        }
      } catch (error) {
        console.error("Failed to fetch more recommendations:", error);
      }
    }

    const nextSong = this.queueService.next();
    if (nextSong) {
      await this.playSong(
        nextSong,
        this.queueService.getQueue(),
        this.queueService.getCurrentIndex(),
      );
    } else {
      this.stopProgressTracking();
      this.updateState({ status: "idle" });
    }
  }

  async playPrevious() {
    if (this.state.progress > 3) {
      await this.seekTo(0);
      return;
    }

    const prevSong = this.queueService.previous();
    if (prevSong) {
      await this.playSong(
        prevSong,
        this.queueService.getQueue(),
        this.queueService.getCurrentIndex(),
      );
    }
  }

  async seekTo(position: number) {
    try {
      await this.audioService.seekTo(position);
      await mediaSessionService.updatePlaybackState(
        this.state.status === "playing",
        position,
      );
      this.updateState({ progress: position });
    } catch (error) {
      console.error("Error seeking:", error);
    }
  }

  toggleShuffle() {
    this.queueService.toggleShuffle();
    this.updateState({
      isShuffled: this.queueService.isShuffled(),
      queue: this.queueService.getQueue(),
      currentIndex: this.queueService.getCurrentIndex(),
    });
  }

  cycleRepeatMode() {
    const newMode = this.queueService.cycleRepeatMode();
    this.updateState({ repeatMode: newMode });
  }

  addToQueue(song: Models.Song) {
    this.queueService.addToQueue(song);
    this.updateState({ queue: this.queueService.getQueue() });
  }

  addNextInQueue(song: Models.Song) {
    this.queueService.addNextInQueue(song);
    this.updateState({ queue: this.queueService.getQueue() });
  }

  getState(): PlayerState {
    return this.state;
  }

  async release() {
    this.stopProgressTracking();
    await this.audioService.release();
    await mediaSessionService.release();
    this.queueService.clear();
    this.updateState({
      status: "idle",
      currentSong: null,
      currentIndex: -1,
      queue: [],
      progress: 0,
      duration: 0,
    });
  }
}

export const playerService = new PlayerService(audioService, queueService);
