import { Models } from "@saavn-labs/sdk";
import { useAudioPlayer } from "expo-audio";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import { audioService } from "../services/AudioService";
import {
  playerService,
  PlayerState as ServicePlayerState,
} from "../services/PlayerService";
import { playerStateService } from "../services/PlayerStateService";

interface PlayerContextValue extends ServicePlayerState {
  /**
   * Play a song with intelligent queue management
   *
   * @param song - The song to play
   * @param queue - Optional. If provided, plays from this collection (Play All). If omitted, uses smart recommendations (individual track tap)
   * @param startIndex - Index of song in queue (only used when queue is provided)
   */
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
  toggleShuffle: () => void;
  toggleRepeatMode: () => void;
  addToQueue: (song: Models.Song) => void;
  addNextInQueue: (song: Models.Song) => void;
  getUpNext: (limit?: number) => Models.Song[];
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const audioPlayer = useAudioPlayer({
    headers: {
      "Accept-Ranges": "bytes",
      Range: "bytes=0-",
    },
  });

  const [state, setState] = useState<ServicePlayerState>(
    playerService.getState(),
  );

  const handleStateUpdate = (newState: ServicePlayerState) => {
    setState(newState);
  };

  useEffect(() => {
    try {
      audioService.setPlayer(audioPlayer);
    } catch (error) {
      console.error("Failed to set audio player:", error);
    }
  }, [audioPlayer]);

  useEffect(() => {
    const restorePlayerState = async () => {
      try {
        const savedState = await playerStateService.getPlayerState();
        if (
          savedState &&
          savedState.currentSong &&
          savedState.seekPosition >= 0
        ) {
          try {
            await playerService.playSong(
              savedState.currentSong,
              [savedState.currentSong],
              0,
            );
            await playerService.seekTo(savedState.seekPosition);
            await playerService.pause();
          } catch (error) {
            console.warn("Failed to restore player state:", error);
          }
        }
      } catch (error) {
        console.error("Failed to restore player state:", error);
      }
    };

    restorePlayerState();
  }, [audioPlayer]);

  useEffect(() => {
    const unsubscribe = playerService.subscribe(handleStateUpdate);
    return () => unsubscribe();
  }, [handleStateUpdate]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        void playerService.ensureBackgroundPlayback();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      void playerService.release();
    };
  }, []);

  const contextValue: PlayerContextValue = {
    ...state,
    playSong: (song, queue, startIndex) =>
      playerService.playSong(song, queue, startIndex),
    play: () => playerService.play(),
    pause: () => playerService.pause(),
    togglePlayPause: () => playerService.togglePlayPause(),
    playNext: () => playerService.playNext(),
    playPrevious: () => playerService.playPrevious(),
    seekTo: (position) => playerService.seekTo(position),
    toggleShuffle: () => playerService.toggleShuffle(),
    toggleRepeatMode: () => playerService.toggleRepeatMode(),
    addToQueue: (song) => playerService.addToQueue(song),
    addNextInQueue: (song) => playerService.addNextInQueue(song),
    getUpNext: (limit) => playerService.getUpNext(limit),
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextValue => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
};
