import { RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import { historyService } from "./HistoryService";

/**
 * QueueService - RNTP is Single Source of Truth
 *
 * PRINCIPLES:
 * 1. RNTP owns the queue - we just prepare and add tracks
 * 2. No JS-side queue syncing - RNTP tells us what's playing via events
 * 3. Track by song.id, not index (index can drift)
 * 4. Shuffle/Repeat handled by RNTP natively
 */

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

  /**
   * Called when RNTP changes active track
   * Returns the Song object for the new track
   */
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

  /**
   * Set current song and upcoming tracks
   * Called when playing a new song/playlist
   */
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

  /**
   * Add more tracks to end of queue
   * Called when reaching end and need recommendations
   */
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

  /**
   * Update upcoming tracks display (called after track changes)
   */
  private updateUpcomingDisplay(): void {
    if (!this.currentSong?.id) return;

    this.upcomingTracks = this.upcomingTracks.filter(
      (s) => s.id !== this.currentSong?.id,
    );
  }

  /**
   * Set repeat mode
   */
  setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
    this.notifyUpdate();
  }

  /**
   * Get current state
   */
  getState(): QueueState {
    return {
      currentSong: this.currentSong,
      upcomingTracks: [...this.upcomingTracks],
      repeatMode: this.repeatMode,
    };
  }

  /**
   * Clear everything
   */
  clear(): void {
    this.currentSong = null;
    this.upcomingTracks = [];
    this.trackIdMap.clear();
    this.repeatMode = "off";
    this.notifyUpdate();
  }

  /**
   * Add song to end of queue
   */
  addToQueue(song: Models.Song): void {
    if (song.id) {
      this.trackIdMap.set(song.id, song);
    }
    this.upcomingTracks.push(song);
    this.notifyUpdate();
  }

  /**
   * Add song to play next (after current track)
   */
  addNextInQueue(song: Models.Song): void {
    if (song.id) {
      this.trackIdMap.set(song.id, song);
    }
    this.upcomingTracks.unshift(song);
    this.notifyUpdate();
  }

  /**
   * Get song by ID (for RNTP track mapping)
   */
  getSongById(songId: string): Models.Song | null {
    return this.trackIdMap.get(songId) || null;
  }

  /**
   * Fetch recommendations filtered by history
   */
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
    } catch (e) {
      if (__DEV__) console.error("[Queue] Fetch recommendations failed:", e);
      return [];
    }
  }

  /**
   * Track play in history
   */
  private async trackPlay(song: Models.Song): Promise<void> {
    if (song?.id) {
      try {
        await historyService.addToHistory(song, 0);
      } catch (e) {
        if (__DEV__) console.error("[Queue] Track play failed:", e);
      }
    }
  }

  /**
   * Notify state updater
   */
  private notifyUpdate(): void {
    this.stateUpdater?.({
      currentSong: this.currentSong,
      upcomingTracks: [...this.upcomingTracks],
      repeatMode: this.repeatMode,
    });
  }

  /**
   * Get upcoming count
   */
  getUpcomingCount(): number {
    return this.upcomingTracks.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.upcomingTracks.length === 0;
  }
}

export const queueService = new QueueService();
