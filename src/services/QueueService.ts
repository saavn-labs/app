import { RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import { historyService } from "./HistoryService";

export interface QueueState {
  currentSong: Models.Song | null;
  upcomingTracks: Models.Song[];
  repeatMode: RepeatMode;
}

type StateUpdater = (updates: Partial<QueueState>) => void;

export class QueueService {
  private currentSong: Models.Song | null = null;
  private upcomingTracks: Models.Song[] = [];
  private repeatMode: RepeatMode = "off";
  private stateUpdater: StateUpdater | null = null;

  private trackIdMap = new Map<string, Models.Song>();

  setStateUpdater(updater: StateUpdater): void {
    this.stateUpdater = updater;
  }

  onTrackChanged(rnTPTrackId: string | undefined): Models.Song | null {
    if (!rnTPTrackId) return null;

    const song = this.trackIdMap.get(rnTPTrackId);
    if (song) {
      this.currentSong = song;
      this.updateUpcomingDisplay();
      this.notifyUpdate();

      this.trackPlay(song);
    }

    return song || null;
  }

  async setQueue(
    currentSong: Models.Song,
    providedQueue?: Models.Song[],
  ): Promise<Models.Song[]> {
    this.currentSong = currentSong;
    this.trackIdMap.clear();

    let fullQueue: Models.Song[] = [];

    if (providedQueue?.length) {
      fullQueue = [currentSong, ...providedQueue];
    } else {
      const recs = await this.fetchRecommendations(currentSong.id);
      fullQueue = [currentSong, ...recs.slice(0, 10)];
    }

    fullQueue.forEach((song) => {
      if (song.id) {
        this.trackIdMap.set(song.id, song);
      }
    });

    this.upcomingTracks = fullQueue.slice(1);
    this.notifyUpdate();

    await this.trackPlay(currentSong);

    return fullQueue;
  }

  async extendQueue(seedSongId: string): Promise<Models.Song[]> {
    const recs = await this.fetchRecommendations(seedSongId);

    if (recs.length > 0) {
      recs.forEach((song) => {
        if (song.id) {
          this.trackIdMap.set(song.id, song);
        }
      });

      this.upcomingTracks.push(...recs.slice(0, 10));
      this.notifyUpdate();
    }

    return recs.slice(0, 10);
  }

  private updateUpcomingDisplay(): void {
    if (!this.currentSong?.id) return;

    this.upcomingTracks = this.upcomingTracks.filter(
      (s) => s.id !== this.currentSong?.id,
    );
  }

  setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
    this.notifyUpdate();
  }

  getState(): QueueState {
    return {
      currentSong: this.currentSong,
      upcomingTracks: [...this.upcomingTracks],
      repeatMode: this.repeatMode,
    };
  }

  clear(): void {
    this.currentSong = null;
    this.upcomingTracks = [];
    this.trackIdMap.clear();
    this.repeatMode = "off";
    this.notifyUpdate();
  }

  addToQueue(song: Models.Song): void {
    if (song.id) {
      this.trackIdMap.set(song.id, song);
    }
    this.upcomingTracks.push(song);
    this.notifyUpdate();
  }

  addNextInQueue(song: Models.Song): void {
    if (song.id) {
      this.trackIdMap.set(song.id, song);
    }
    this.upcomingTracks.unshift(song);
    this.notifyUpdate();
  }

  getSongById(songId: string): Models.Song | null {
    return this.trackIdMap.get(songId) || null;
  }

  private async fetchRecommendations(
    seedSongId: string,
  ): Promise<Models.Song[]> {
    try {
      const songs = await Song.getRecommendations({ songId: seedSongId });
      const history = await historyService.getHistory();
      const playedIds = new Set(history.map((entry) => entry.song.id));
      const queueIds = new Set([...this.trackIdMap.keys()]);

      return songs.filter(
        (s) =>
          s.id !== seedSongId && !playedIds.has(s.id) && !queueIds.has(s.id),
      );
    } catch (error) {
      console.error("[Queue] Fetch recommendations failed:", error);
      return [];
    }
  }

  private async trackPlay(song: Models.Song): Promise<void> {
    if (song?.id) {
      try {
        await historyService.addToHistory(song, 0);
      } catch (error) {
        console.error("[Queue] Track play failed:", error);
      }
    }
  }

  private notifyUpdate(): void {
    this.stateUpdater?.({
      currentSong: this.currentSong,
      upcomingTracks: [...this.upcomingTracks],
      repeatMode: this.repeatMode,
    });
  }

  getUpcomingCount(): number {
    return this.upcomingTracks.length;
  }

  isEmpty(): boolean {
    return this.upcomingTracks.length === 0;
  }
}

export const queueService = new QueueService();
