import { RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";
import { historyService } from "./HistoryService";

export interface QueueState {
  queue: Models.Song[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
}

export type NavigationAction = 
  | { type: "play"; song: Models.Song; queue?: Models.Song[]; index?: number }
  | { type: "next"; seekPosition?: number }
  | { type: "previous"; seekPosition?: number }
  | { type: "jump"; index: number }
  | { type: "toggle-shuffle" }
  | { type: "toggle-repeat" }
  | { type: "clear" };

export interface GetUpNextResult {
  song: Models.Song | null;
  shouldLoad: boolean;
  shouldRestart: boolean;
  currentIndex: number;
  queue: Models.Song[];
  windowedQueue: Models.Song[];
  windowedIndex: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
}

type StateUpdater = (updates: Partial<QueueState>) => void;

export class QueueService {
  private queue: Models.Song[] = [];
  private currentIndex = -1;
  private originalQueue: Models.Song[] = [];
  private shuffled = false;
  private repeatMode: RepeatMode = false;
  private stateUpdater: StateUpdater | null = null;

  private readonly MAX_PREVIOUS = 10;
  private readonly MIN_AFTER = 1;
  private readonly MAX_AFTER = 9;

  setStateUpdater(updater: StateUpdater): void {
    this.stateUpdater = updater;
  }

  /**
   * Main interface for PlayerService - handles all queue operations
   * Returns the next song to play based on the action
   */
  async getUpNext(action: NavigationAction): Promise<GetUpNextResult> {
    switch (action.type) {
      case "play":
        return await this.handlePlay(action.song, action.queue, action.index);
      
      case "next":
        return await this.handleNext(action.seekPosition);
      
      case "previous":
        return this.handlePrevious(action.seekPosition);
      
      case "jump":
        return this.handleJump(action.index);
      
      case "toggle-shuffle":
        return this.handleToggleShuffle();
      
      case "toggle-repeat":
        return this.handleToggleRepeat();
      
      case "clear":
        return this.handleClear();
      
      default:
        return this.buildResult(null, false, false);
    }
  }


  toggleShuffle(): void {
    this.shuffled ? this.unshuffle() : this.shuffle();
    this.notifyUpdate();
  }

  toggleRepeatMode(): RepeatMode {
    this.repeatMode = !this.repeatMode;
    this.notifyUpdate();
    return this.repeatMode;
  }

  getState(): QueueState {
    return {
      queue: [...this.queue],
      currentIndex: this.currentIndex,
      isShuffled: this.shuffled,
      repeatMode: this.repeatMode,
    };
  }


  private async handlePlay(
    song: Models.Song,
    queue?: Models.Song[],
    startIndex?: number
  ): Promise<GetUpNextResult> {
    if (!song.id) {
      return this.buildResult(null, false, false);
    }

    if (queue?.length) {

      const idx = startIndex ?? queue.findIndex((s) => s.id === song.id);
      await this.setQueue(queue, Math.max(0, idx));


      const upcoming = this.getUpcomingSongs(1);
      if (!upcoming.length) {
        const recs = await this.fetchRecommendationsFiltered(song.id);
        if (recs?.length) {
          this.appendToQueue(recs.slice(0, 10));
        }
      }
    } else {

      const recs = await this.fetchRecommendationsFiltered(song.id);
      await this.setQueue([song, ...recs.slice(0, 10)], 0);
    }

    return this.buildResult(song, true, false);
  }

  private async handleNext(seekPosition?: number): Promise<GetUpNextResult> {

    if (this.repeatMode && this.isValid(this.currentIndex)) {
      const current = this.getCurrentSong();
      return this.buildResult(current, false, true);
    }


    const isLast = this.currentIndex >= this.queue.length - 1;

    if (isLast) {

      const currentSong = this.getCurrentSong();
      if (currentSong?.id) {
        const recs = await this.fetchRecommendationsFiltered(currentSong.id);
        if (recs?.length) {
          this.appendToQueue(recs.slice(0, 10));
        }
      }
    }


    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      await this.trackPlay(this.getCurrentSong());
      this.truncateQueue();
      this.notifyUpdate();
      return this.buildResult(this.getCurrentSong(), true, false);
    }


    return this.buildResult(null, false, false);
  }

  private handlePrevious(seekPosition?: number): GetUpNextResult {

    if (seekPosition !== undefined && seekPosition > 3) {
      return this.buildResult(this.getCurrentSong(), false, true);
    }


    if (this.repeatMode && this.isValid(this.currentIndex)) {
      return this.buildResult(this.getCurrentSong(), false, true);
    }


    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.truncateQueue();
      this.notifyUpdate();
      return this.buildResult(this.getCurrentSong(), true, false);
    }


    return this.buildResult(this.getCurrentSong(), false, true);
  }

  private handleJump(index: number): GetUpNextResult {
    if (!this.isValid(index)) {
      return this.buildResult(null, false, false);
    }

    this.currentIndex = index;
    this.truncateQueue();
    this.notifyUpdate();
    return this.buildResult(this.getCurrentSong(), true, false);
  }

  private handleToggleShuffle(): GetUpNextResult {
    this.shuffled ? this.unshuffle() : this.shuffle();
    this.notifyUpdate();
    return this.buildResult(this.getCurrentSong(), false, false);
  }

  private handleToggleRepeat(): GetUpNextResult {
    this.repeatMode = !this.repeatMode;
    this.notifyUpdate();
    return this.buildResult(this.getCurrentSong(), false, false);
  }

  private handleClear(): GetUpNextResult {
    this.queue = this.originalQueue = [];
    this.currentIndex = -1;
    this.shuffled = false;
    this.repeatMode = false;
    this.notifyUpdate();
    return this.buildResult(null, false, false);
  }

  private async fetchRecommendationsFiltered(
    seedSongId: string
  ): Promise<Models.Song[]> {
    try {
      const songs = await Song.getRecommendations({ songId: seedSongId });
      const history = await historyService.getHistory();
      const playedIds = new Set(history.map((entry) => entry.song.id));
      

      const queueIds = new Set(this.queue.map((s) => s.id));

      return songs.filter(
        (s) => s.id !== seedSongId && !playedIds.has(s.id) && !queueIds.has(s.id)
      );
    } catch (e) {
      if (__DEV__) console.error("[Queue] Fetch recommendations failed:", e);
      return [];
    }
  }

  private async trackPlay(song: Models.Song | null): Promise<void> {
    if (song) {
      await historyService.addToHistory(song, 0);
    }
  }

  private async setQueue(
    songs: Models.Song[],
    startIndex = 0
  ): Promise<void> {
    this.queue = this.originalQueue = [...songs];
    this.currentIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
    this.shuffled = false;

    await this.trackPlay(this.getCurrentSong());
    this.truncateQueue();
    this.notifyUpdate();
  }

  private appendToQueue(songs: Models.Song[]): void {
    if (!songs?.length) return;

    this.queue.push(...songs);
    if (!this.shuffled) {
      this.originalQueue.push(...songs);
    }

    this.truncateQueue();
    this.notifyUpdate();
  }

  private getCurrentSong(): Models.Song | null {
    return this.isValid(this.currentIndex)
      ? this.queue[this.currentIndex]
      : null;
  }

  private getUpcomingSongs(limit = this.MAX_AFTER): Models.Song[] {
    if (!this.isValid(this.currentIndex)) return [];

    const bounded = Math.max(this.MIN_AFTER, Math.min(limit, this.MAX_AFTER));
    const start = this.currentIndex + 1;
    return this.queue.slice(start, start + bounded);
  }

  private buildResult(
    song: Models.Song | null,
    shouldLoad: boolean,
    shouldRestart: boolean
  ): GetUpNextResult {
    const windowed = this.getWindowedQueue();

    return {
      song,
      shouldLoad,
      shouldRestart,
      currentIndex: this.currentIndex,
      queue: [...this.queue],
      windowedQueue: windowed.queue,
      windowedIndex: windowed.currentIndex,
      isShuffled: this.shuffled,
      repeatMode: this.repeatMode,
    };
  }

  private getWindowedQueue(): { queue: Models.Song[]; currentIndex: number } {
    if (!this.isValid(this.currentIndex)) {
      return { queue: [], currentIndex: -1 };
    }

    const start = Math.max(0, this.currentIndex - this.MAX_PREVIOUS);
    const after = Math.min(
      Math.max(this.MIN_AFTER, this.MAX_AFTER),
      this.queue.length - this.currentIndex - 1
    );
    const end = this.currentIndex + 1 + after;

    return {
      queue: this.queue.slice(start, end),
      currentIndex: this.currentIndex - start,
    };
  }

  private isValid(idx: number): boolean {
    return idx >= 0 && idx < this.queue.length;
  }

  private shuffle(): void {
    const current = this.getCurrentSong();
    if (!this.shuffled) {
      this.originalQueue = [...this.queue];
    }

    if (!current) {
      this.queue = this.fisherYates(this.queue);
      this.currentIndex = 0;
    } else {
      const rest = [
        ...this.queue.slice(0, this.currentIndex),
        ...this.queue.slice(this.currentIndex + 1),
      ];
      this.queue = [current, ...this.fisherYates(rest)];
      this.currentIndex = 0;
    }

    this.shuffled = true;
  }

  private unshuffle(): void {
    const current = this.getCurrentSong();
    this.queue = [...this.originalQueue];

    if (current) {
      this.currentIndex = this.queue.findIndex((s) => s.id === current.id);
    }

    if (this.currentIndex === -1 && this.queue.length > 0) {
      this.currentIndex = 0;
    }

    this.shuffled = false;
  }

  private fisherYates<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private truncateQueue(): void {
    if (this.currentIndex <= this.MAX_PREVIOUS) return;

    const start = this.currentIndex - this.MAX_PREVIOUS;
    this.queue = this.queue.slice(start);
    this.currentIndex = this.MAX_PREVIOUS;
  }

  private notifyUpdate(): void {
    this.stateUpdater?.({
      queue: [...this.queue],
      currentIndex: this.currentIndex,
      isShuffled: this.shuffled,
      repeatMode: this.repeatMode,
    });
  }
}

export const queueService = new QueueService();
