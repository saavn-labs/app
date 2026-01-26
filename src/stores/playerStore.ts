import { playerService, PlayerState, queueService } from "@/services";
import { RepeatMode } from "@/types";
import { Models } from "@saavn-labs/sdk";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface PlayerStore extends PlayerState {
  dominantColor: string;
  setDominantColor: (color: string) => void;
  playSong: (song: Models.Song, queue?: Models.Song[]) => Promise<void>;
  resume: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  toggleRepeatMode: () => Promise<void>;
  stop: () => Promise<void>;
  addToQueue: (song: Models.Song) => Promise<void>;
  addNextInQueue: (song: Models.Song) => Promise<void>;
  restoreLastTrack: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => {
      playerService.setStateUpdater((updates) => {
        set((state) => ({ ...state, ...updates }));
      });

      queueService.setStateUpdater((updates) => {
        set((state) => ({ ...state, ...updates }));
      });

      return {
        status: "paused",
        currentSong: null,
        upcomingTracks: [],
        progress: 0,
        duration: 0,
        repeatMode: "off" as RepeatMode,
        dominantColor: "#1a1a1a",

        setDominantColor: (color: string) => {
          set({ dominantColor: color });
        },

        playSong: async (song, queue) => {
          try {
            await playerService.play(song, queue);
          } catch (error) {
            console.error("[PlayerStore] playSong error:", error);
            set({ status: "paused" });
          }
        },

        resume: async () => {
          try {
            await playerService.resume();
          } catch (error) {
            console.error("[PlayerStore] resume error:", error);
          }
        },

        pause: async () => {
          try {
            await playerService.pause();
          } catch (error) {
            console.error("[PlayerStore] pause error:", error);
          }
        },

        togglePlayPause: async () => {
          try {
            await playerService.togglePlayPause();
          } catch (error) {
            console.error("[PlayerStore] togglePlayPause error:", error);
          }
        },

        next: async () => {
          try {
            await playerService.next();
          } catch (error) {
            console.error("[PlayerStore] next error:", error);
          }
        },

        previous: async () => {
          try {
            await playerService.previous();
          } catch (error) {
            console.error("[PlayerStore] previous error:", error);
          }
        },

        seekTo: async (position) => {
          set({ progress: position });
          try {
            await playerService.seekTo(position);
          } catch (error) {
            console.error("[PlayerStore] seekTo error:", error);
          }
        },

        toggleRepeatMode: async () => {
          try {
            const currentMode = get().repeatMode;
            const modes: RepeatMode[] = ["off", "all", "one"];
            const currentIdx = modes.indexOf(currentMode);
            const newMode = modes[(currentIdx + 1) % modes.length];

            await playerService.setRepeatMode(newMode);
          } catch (error) {
            console.error("[PlayerStore] toggleRepeatMode error:", error);
          }
        },

        stop: async () => {
          try {
            await playerService.stop();
          } catch (error) {
            console.error("[PlayerStore] stop error:", error);
          }
        },

        addToQueue: async (song) => {
          try {
            await playerService.addToQueue(song);
          } catch (error) {
            console.error("[PlayerStore] addToQueue error:", error);
          }
        },

        addNextInQueue: async (song) => {
          try {
            await playerService.addNextInQueue(song);
          } catch (error) {
            console.error("[PlayerStore] addNextInQueue error:", error);
          }
        },

        restoreLastTrack: async () => {
          try {
            const state = get();
            if (state.currentSong) {
              await playerService.restoreLastPlayedTrack(
                state.currentSong,
                state.progress,
              );
            }
          } catch (error) {
            console.error("[PlayerStore] restoreLastTrack error:", error);
          }
        },
      };
    },
    {
      name: "player-storage",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        currentSong: state.currentSong,
        progress: state.progress,
        duration: state.duration,
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
export const useUpcomingTracks = () =>
  usePlayerStore((state) => state.upcomingTracks);
export const useRepeatMode = () => usePlayerStore((state) => state.repeatMode);
export const useDominantColor = () =>
  usePlayerStore((state) => state.dominantColor);

export const usePlayerActions = () =>
  usePlayerStore((state) => ({
    playSong: state.playSong,
    resume: state.resume,
    pause: state.pause,
    togglePlayPause: state.togglePlayPause,
    next: state.next,
    previous: state.previous,
    seekTo: state.seekTo,
    toggleRepeatMode: state.toggleRepeatMode,
    stop: state.stop,
  }));

export const useSetDominantColor = () =>
  usePlayerStore((state) => state.setDominantColor);
