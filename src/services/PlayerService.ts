import { PlayerStatus, RepeatMode } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Models, Song } from "@saavn-labs/sdk";
import {
  AudioPlayer,
  setAudioModeAsync,
  AudioStatus,
  AudioMetadata,
  AudioLockScreenOptions,
} from "expo-audio";
import type { EventSubscription } from "expo-modules-core";
import { AUDIO_QUALITY, STORAGE_KEYS } from "../constants";
import { throttle } from "../utils/asyncHelpers";
import { queueService, type GetUpNextResult } from "./QueueService";

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

interface SavedState {
  currentSong: Models.Song | null;
  seekPosition: number;
  timestamp: string;
}

type StateUpdater = (updates: Partial<PlayerState>) => void;

export class PlayerService {
  private player: AudioPlayer | null = null;
  private currentUrl = "";
  private audioModeReady = false;
  private stateUpdater: StateUpdater | null = null;
  private statusUnsubscribe: EventSubscription | null = null;
  private lastSavePosition = 0;

  private readonly throttledSave = throttle(
    (pos: number) => this.save(pos),
    2000,
  );

  setStateUpdater(updater: StateUpdater): void {
    this.stateUpdater = updater;
  }

  setAudioPlayer(player: AudioPlayer): void {
    this.player = player;
    this.setupStatusListener();
  }

  private async ensureAudio(): Promise<void> {
    if (this.audioModeReady) return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: "doNotMix",
      });
      this.audioModeReady = true;
    } catch (e) {
      if (__DEV__) console.error("[Player] Audio mode failed:", e);
    }
  }

  private setupStatusListener(): void {
    if (!this.player) return;


    this.statusUnsubscribe?.remove();


    this.statusUnsubscribe = this.player.addListener(
      "playbackStatusUpdate",
      (status: AudioStatus) => {
        this.handleStatusUpdate(status);
      },
    );
  }

  private handleStatusUpdate(status: AudioStatus): void {
    const {
      currentTime,
      duration,
      playing,
      isLoaded,
      isBuffering,
      didJustFinish,
    } = status;


    this.notify({
      progress: currentTime,
      duration: duration || 0,
      status: this.getPlayerStatus(playing, isLoaded, isBuffering),
    });


    if (playing && currentTime > 0) {
      this.throttledSave(currentTime);
    }


    if (didJustFinish) {
      void this.playNext();
    }
  }

  private getPlayerStatus(
    playing: boolean,
    isLoaded: boolean,
    isBuffering: boolean,
  ): PlayerStatus {
    if (isBuffering) return "loading";
    if (!isLoaded) return "idle";
    return playing ? "playing" : "paused";
  }

  async playSong(
    song: Models.Song,
    queue?: Models.Song[],
    startIndex?: number,
  ): Promise<void> {
    try {
      if (!song.id) throw new Error("Invalid song ID");

      this.notify({ status: "loading", error: null });

      const result = await queueService.getUpNext({
        type: "play",
        song,
        queue,
        index: startIndex,
      });

      if (result.song) {
        await this.loadAndPlay(result.song);
        this.updateStateFromQueue(result);
      }
    } catch (e) {
      this.handleError("playSong", e);
    }
  }

  async play(): Promise<void> {
    try {
      if (!this.player) throw new Error("Player not initialized");

      await this.ensureAudio();
      this.player.play();
      this.notify({ status: "playing" });
    } catch (e) {
      this.handleError("play", e);
    }
  }

  async pause(): Promise<void> {
    try {
      if (!this.player) return;

      this.player.pause();
      this.notify({ status: "paused" });


      await this.save(this.player.currentTime);
    } catch (e) {
      this.handleError("pause", e);
    }
  }

  async togglePlayPause(): Promise<void> {
    this.player?.playing ? await this.pause() : await this.play();
  }

  async playNext(): Promise<void> {
    try {
      const result = await queueService.getUpNext({
        type: "next",
      });

      if (result.shouldRestart) {
        await this.seekTo(0);
        await this.play();
        return;
      }

      if (result.song && result.shouldLoad) {
        await this.loadAndPlay(result.song);
        this.updateStateFromQueue(result);
      } else {
        this.notify({ status: "idle" });
      }
    } catch (e) {
      this.handleError("playNext", e);
    }
  }

  async playPrevious(): Promise<void> {
    try {
      const currentTime = this.player?.currentTime || 0;

      const result = await queueService.getUpNext({
        type: "previous",
        seekPosition: currentTime,
      });

      if (result.shouldRestart) {
        await this.seekTo(0);
        return;
      }

      if (result.song && result.shouldLoad) {
        await this.loadAndPlay(result.song);
        this.updateStateFromQueue(result);
      }
    } catch (e) {
      this.handleError("playPrevious", e);
    }
  }

  async seekTo(pos: number): Promise<void> {
    try {
      if (!this.player) return;

      await this.player.seekTo(pos);
      this.notify({ progress: pos });
    } catch (e) {
      this.handleError("seekTo", e);
    }
  }

  async jumpToQueueIndex(index: number): Promise<void> {
    try {
      const result = await queueService.getUpNext({
        type: "jump",
        index,
      });

      if (result.song && result.shouldLoad) {
        await this.loadAndPlay(result.song);
        this.updateStateFromQueue(result);
      }
    } catch (e) {
      this.handleError("jumpToQueueIndex", e);
    }
  }

  async release(): Promise<void> {

    this.statusUnsubscribe?.remove();
    this.statusUnsubscribe = null;


    if (this.player) {
      this.player.clearLockScreenControls();
      this.player.remove();
    }

    this.player = null;
    this.currentUrl = "";
    this.audioModeReady = false;

    await queueService.getUpNext({ type: "clear" });
    this.notify({
      status: "idle",
      currentSong: null,
      currentIndex: -1,
      queue: [],
      progress: 0,
      duration: 0,
    });
  }

  private async loadAndPlay(song: Models.Song): Promise<void> {
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
      (await AsyncStorage.getItem(STORAGE_KEYS.CONTENT_QUALITY)) || "medium";
    const idx =
      AUDIO_QUALITY[quality.toUpperCase() as keyof typeof AUDIO_QUALITY] ||
      AUDIO_QUALITY.MEDIUM;
    const url = urls[idx].url;

    if (!url) throw new Error("No streaming URL");

    await this.ensureAudio();
    if (!this.player) throw new Error("Player not initialized");


    if (this.currentUrl !== url) {
      this.player.replace(url);
      this.currentUrl = url;
    }

    this.player.play();


    this.updateLockScreenMetadata(song);

    this.notify({
      status: "playing",
      currentSong: song,
      progress: 0,
    });

    await this.save(0);
  }

  private updateLockScreenMetadata(song: Models.Song): void {
    if (!this.player) return;

    try {
      const artist =
        song.artists?.primary?.map((a) => a.name).join(", ") ||
        "Unknown Artist";
      const album =
        typeof song.album === "string" ? song.album : song.album?.title || "";
      const artworkUrl = song.images?.[2]?.url || song.images?.[0]?.url || "";

      const metadata: AudioMetadata = {
        title: song.title || "Unknown",
        artist,
        albumTitle: album || "Unknown Album",
        artworkUrl: artworkUrl || undefined,
      };

      const options: AudioLockScreenOptions = {
        showSeekBackward: true,
        showSeekForward: true,
      };

      this.player.setActiveForLockScreen(true, metadata, options);
    } catch (e) {
      if (__DEV__) console.error("[Player] Lock screen update failed:", e);
    }
  }

  private updateStateFromQueue(result: GetUpNextResult): void {
    this.notify({
      queue: result.windowedQueue,
      currentIndex: result.windowedIndex,
      isShuffled: result.isShuffled,
      repeatMode: result.repeatMode,
    });
  }

  private notify(updates: Partial<PlayerState>): void {
    this.stateUpdater?.(updates);
  }

  private async save(pos: number): Promise<void> {

    if (Math.abs(pos - this.lastSavePosition) < 1) return;
    this.lastSavePosition = pos;

    const state = queueService.getState();
    const song = state.queue[state.currentIndex];
    if (!song) return;

    try {
      const savedState: SavedState = {
        currentSong: song,
        seekPosition: pos,
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.PLAYER_STATE,
        JSON.stringify(savedState),
      );
    } catch (e) {
      if (__DEV__) console.error("[Player] Save failed:", e);
    }
  }

  private handleError(context: string, error: unknown): void {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (__DEV__) {
      console.error(`[PlayerService.${context}]`, error);
    }
    this.notify({ status: "error", error: msg });
  }
}

export const playerService = new PlayerService();

export const initializeAudioMode = async (): Promise<void> => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  } catch (e) {
    if (__DEV__) console.error("[Player] Audio mode init failed:", e);
  }
};
