import { playerService, PlayerState } from "@/services/PlayerService";
import { queueService } from "@/services/QueueService";
import { Models } from "@saavn-labs/sdk";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface PlayerStore extends PlayerState {
  dominantColor: string;
  setDominantColor: (color: string) => void;
  playSong: (
    song: Models.Song,
    queue?: Models.Song[],
    startIndex?: number,
  ) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  toggleRepeatMode: () => void;
  jumpToQueueIndex: (index: number) => Promise<void>;
  release: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, _) => {
      playerService.setStateUpdater((updates) => {
        set((state) => ({ ...state, ...updates }));
      });

      queueService.setStateUpdater((updates) => {
        set((state) => ({ ...state, ...updates }));
      });

      return {
        status: "idle",
        currentSong: null,
        currentIndex: -1,
        queue: [],
        progress: 0,
        duration: 0,
        isShuffled: false,
        repeatMode: false,
        error: null,
        dominantColor: "#1a1a1a",

        setDominantColor: (color: string) => {
          set({ dominantColor: color });
        },

        playSong: async (song, queue, startIndex) => {
          await playerService.playSong(song, queue, startIndex);
        },

        play: async () => {
          await playerService.play();
        },

        pause: async () => {
          await playerService.pause();
        },

        togglePlayPause: async () => {
          await playerService.togglePlayPause();
        },

        playNext: async () => {
          await playerService.playNext();
        },

        playPrevious: async () => {
          await playerService.playPrevious();
        },

        seekTo: async (position) => {
          set({ progress: position });
          await playerService.seekTo(position);
        },

        toggleRepeatMode: () => {
          const newMode = queueService.toggleRepeatMode();
          set({ repeatMode: newMode });
        },

        jumpToQueueIndex: async (index) => {
          await playerService.jumpToQueueIndex(index);
        },

        release: async () => {
          await playerService.release();
        },
      };
    },
    {
      name: "player-storage",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        queue: state.queue,
        currentIndex: state.currentIndex,
        currentSong: state.currentSong,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
        dominantColor: state.dominantColor,
      }),
    },
  ),
);

export const usePlaybackStatus = () => usePlayerStore((state) => state.status);
export const useCurrentSong = () =>
  usePlayerStore((state) => state.currentSong);
export const useProgress = () => usePlayerStore((state) => state.progress);
export const useDuration = () => usePlayerStore((state) => state.duration);
export const useQueue = () =>
  usePlayerStore((state) => ({
    queue: state.queue,
    currentIndex: state.currentIndex,
  }));
export const usePlaybackControls = () =>
  usePlayerStore((state) => ({
    isShuffled: state.isShuffled,
    repeatMode: state.repeatMode,
  }));
export const usePlayerActions = () =>
  usePlayerStore((state) => ({
    playSong: state.playSong,
    play: state.play,
    pause: state.pause,
    togglePlayPause: state.togglePlayPause,
    playNext: state.playNext,
    playPrevious: state.playPrevious,
    seekTo: state.seekTo,
    toggleRepeatMode: state.toggleRepeatMode,
  }));
export const useDominantColor = () =>
  usePlayerStore((state) => state.dominantColor);
export const useSetDominantColor = () =>
  usePlayerStore((state) => state.setDominantColor);
