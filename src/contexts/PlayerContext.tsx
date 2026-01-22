import { Models } from "@saavn-labs/sdk";
import { useAudioPlayer } from "expo-audio";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  cycleRepeatMode: () => void;
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
  const [stateRestored, setStateRestored] = useState(false);

  const handleStateUpdate = useCallback((newState: ServicePlayerState) => {
    setState(newState);
  }, []);

  useEffect(() => {
    audioService.setPlayer(audioPlayer);
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
          await playerService.playSong(
            savedState.currentSong,
            [savedState.currentSong],
            0,
          );

          setTimeout(async () => {
            await playerService.seekTo(savedState.seekPosition);
            await playerService.pause();
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to restore player state:", error);
      } finally {
        setStateRestored(true);
      }
    };

    restorePlayerState();
  }, [audioPlayer]);

  useEffect(() => {
    const unsubscribe = playerService.subscribe(handleStateUpdate);

    return () => {
      unsubscribe();
    };
  }, [handleStateUpdate]);

  const playSong = useCallback(
    (song: Models.Song, queue?: Models.Song[], startIndex?: number) =>
      playerService.playSong(song, queue, startIndex),
    [],
  );

  const play = useCallback(() => playerService.play(), []);
  const pause = useCallback(() => playerService.pause(), []);
  const togglePlayPause = useCallback(
    () => playerService.togglePlayPause(),
    [],
  );
  const playNext = useCallback(() => playerService.playNext(), []);
  const playPrevious = useCallback(() => playerService.playPrevious(), []);
  const seekTo = useCallback(
    (position: number) => playerService.seekTo(position),
    [],
  );
  const toggleShuffle = useCallback(() => playerService.toggleShuffle(), []);
  const cycleRepeatMode = useCallback(
    () => playerService.cycleRepeatMode(),
    [],
  );
  const addToQueue = useCallback(
    (song: Models.Song) => playerService.addToQueue(song),
    [],
  );
  const addNextInQueue = useCallback(
    (song: Models.Song) => playerService.addNextInQueue(song),
    [],
  );
  const getUpNext = useCallback(
    (limit?: number) => playerService.getUpNext(limit),
    [],
  );

  const contextValue: PlayerContextValue = useMemo(
    () => ({
      ...state,
      playSong,
      play,
      pause,
      togglePlayPause,
      playNext,
      playPrevious,
      seekTo,
      toggleShuffle,
      cycleRepeatMode,
      addToQueue,
      addNextInQueue,
      getUpNext,
    }),
    [
      state,
      playSong,
      play,
      pause,
      togglePlayPause,
      playNext,
      playPrevious,
      seekTo,
      toggleShuffle,
      cycleRepeatMode,
      addToQueue,
      addNextInQueue,
      getUpNext,
    ],
  );

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
