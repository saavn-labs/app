import { Models } from "@saavn-labs/sdk";
import { PlayerStatus, RepeatMode } from "@/types";

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
