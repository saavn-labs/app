import { RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";

export class QueueService {
  private queue: Models.Song[] = [];
  private currentIndex: number = -1;
  private originalQueue: Models.Song[] = [];
  private shuffled: boolean = false;
  private repeatMode: RepeatMode = "off";
  private playedIndices: Set<number> = new Set();
  private readonly maxPrevious: number = 10;
  private readonly minAfter: number = 1;
  private readonly maxAfter: number = 9;

  async fetchRecommendations(
    seedSongId: string,
    excludeSeed: boolean = true,
  ): Promise<Models.Song[]> {
    const songs = await Song.getRecommendations({ songId: seedSongId });
    return excludeSeed ? songs.filter((s) => s.id !== seedSongId) : songs;
  }

  getPlayedSongs(): Models.Song[] {
    return this.queue.slice(0, this.currentIndex + 1);
  }

  setQueue(
    songs: Models.Song[],
    startIndex: number = 0,
    prependedSongs?: Models.Song[],
  ) {
    const allSongs = prependedSongs
      ? [...prependedSongs, ...songs]
      : [...songs];
    const newStartIndex = prependedSongs
      ? prependedSongs.length + startIndex
      : startIndex;

    this.queue = allSongs;
    this.originalQueue = allSongs;
    this.currentIndex = newStartIndex;
    this.shuffled = false;
    this.playedIndices = new Set([newStartIndex]);
    this.truncateQueue();
  }

  appendQueue(songs: Models.Song[]) {
    // Only cleanup if we have skipped songs to reclaim memory
    if (this.playedIndices.size < this.currentIndex) {
      this.cleanupSkippedSongs();
    }
    this.queue.splice(this.currentIndex + 1, 0, ...songs);
    if (!this.shuffled) {
      this.originalQueue.splice(this.currentIndex + 1, 0, ...songs);
    }
    this.truncateQueue();
  }

  private cleanupSkippedSongs() {
    // Collect only played songs
    const playedSongs = this.queue
      .slice(0, this.currentIndex + 1)
      .filter((_, i) => this.playedIndices.has(i));

    // Combine with remaining songs after current
    this.queue = [...playedSongs, ...this.queue.slice(this.currentIndex + 1)];
    this.currentIndex = playedSongs.length - 1;

    // Reset played indices (all songs up to current are now "played")
    this.playedIndices.clear();
    for (let i = 0; i <= this.currentIndex; i++) {
      this.playedIndices.add(i);
    }

    // Sync original queue if not shuffled
    if (!this.shuffled) {
      this.originalQueue = this.queue;
    }
  }

  private truncateQueue() {
    if (this.currentIndex <= this.maxPrevious) return;

    const startIndex = this.currentIndex - this.maxPrevious;
    this.queue = this.queue.slice(startIndex);
    this.currentIndex = this.maxPrevious;

    const newPlayed = new Set<number>();
    for (let i = 0; i <= this.currentIndex; i++) {
      newPlayed.add(i);
    }
    this.playedIndices = newPlayed;

    if (!this.shuffled) {
      this.originalQueue = this.queue;
    }
  }

  addToQueue(song: Models.Song) {
    this.queue.push(song);
    if (!this.shuffled) {
      this.originalQueue.push(song);
    }
  }

  addNextInQueue(song: Models.Song) {
    this.queue.splice(this.currentIndex + 1, 0, song);
    if (!this.shuffled) {
      this.originalQueue.splice(this.currentIndex + 1, 0, song);
    }
  }

  getCurrentSong(): Models.Song | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) {
      return null;
    }
    return this.queue[this.currentIndex];
  }

  getQueue(): Models.Song[] {
    return [...this.queue];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getUpNext(limit?: number): Models.Song[] {
    const requested = limit ?? this.maxAfter;
    const boundedLimit = Math.max(
      this.minAfter,
      Math.min(requested, this.maxAfter),
    );
    return this.queue.slice(
      this.currentIndex + 1,
      this.currentIndex + boundedLimit + 1,
    );
  }

  getWindowedQueue(): { queue: Models.Song[]; currentIndex: number } {
    if (this.currentIndex < 0 || this.queue.length === 0) {
      return { queue: [], currentIndex: -1 };
    }

    const start = Math.max(0, this.currentIndex - this.maxPrevious);
    const availableAfter = Math.max(
      0,
      this.queue.length - this.currentIndex - 1,
    );
    const desiredAfter = Math.max(
      this.minAfter,
      Math.min(availableAfter, this.maxAfter),
    );
    const end = Math.min(
      this.queue.length,
      this.currentIndex + 1 + desiredAfter,
    );

    return {
      queue: this.queue.slice(start, end),
      currentIndex: this.currentIndex - start,
    };
  }

  next(): Models.Song | null {
    if (this.repeatMode === "one") {
      return this.getCurrentSong();
    }

    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      this.playedIndices.add(this.currentIndex);
      this.truncateQueue();
    } else if (this.repeatMode === "all" && this.queue.length > 0) {
      this.currentIndex = 0;
      this.playedIndices.add(this.currentIndex);
    } else {
      return null;
    }

    return this.getCurrentSong();
  }

  previous(): Models.Song | null {
    if (this.repeatMode === "one") {
      return this.getCurrentSong();
    }

    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.playedIndices.add(this.currentIndex);
      this.truncateQueue();
    } else if (this.repeatMode === "all" && this.queue.length > 0) {
      this.currentIndex = this.queue.length - 1;
      this.playedIndices.add(this.currentIndex);
    } else {
      return null;
    }

    return this.getCurrentSong();
  }

  jumpTo(index: number): Models.Song | null {
    if (index < 0 || index >= this.queue.length) return null;
    this.currentIndex = index;
    this.playedIndices.add(index);
    this.truncateQueue();
    return this.getCurrentSong();
  }

  toggleShuffle() {
    if (this.shuffled) {
      const currentSong = this.getCurrentSong();
      this.queue = [...this.originalQueue];
      if (currentSong) {
        this.currentIndex = this.queue.findIndex(
          (s) => s.id === currentSong.id,
        );
      }
      this.shuffled = false;
    } else {
      const currentSong = this.getCurrentSong();
      if (currentSong) {
        // Move current song to front
        const currentQueue = this.queue.slice();
        currentQueue.splice(this.currentIndex, 1);
        // Fisher-Yates shuffle for remaining songs
        for (let i = currentQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [currentQueue[i], currentQueue[j]] = [
            currentQueue[j],
            currentQueue[i],
          ];
        }
        this.queue = [currentSong, ...currentQueue];
        this.currentIndex = 0;
      }
      this.shuffled = true;
    }
  }

  isShuffled(): boolean {
    return this.shuffled;
  }

  cycleRepeatMode(): RepeatMode {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const currentIndex = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(currentIndex + 1) % modes.length];
    return this.repeatMode;
  }

  clear() {
    this.queue = [];
    this.originalQueue = [];
    this.currentIndex = -1;
    this.shuffled = false;
    this.playedIndices.clear();
  }
}

export const queueService = new QueueService();
