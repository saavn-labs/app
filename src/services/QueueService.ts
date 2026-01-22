import { RepeatMode } from "@/types";
import { Models, Song } from "@saavn-labs/sdk";

export class QueueService {
  private queue: Models.Song[] = [];
  private currentIndex: number = -1;
  private originalQueue: Models.Song[] = [];
  private shuffled: boolean = false;
  private repeatMode: RepeatMode = "off";
  private playedIndices: Set<number> = new Set();

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
    this.cleanupSkippedSongs();
    this.queue.splice(this.currentIndex + 1, 0, ...songs);
    if (!this.shuffled) {
      this.originalQueue.splice(this.currentIndex + 1, 0, ...songs);
    }
    this.truncateQueue();
  }

  private cleanupSkippedSongs() {
    const playedSongs: Models.Song[] = [];
    const playedOriginalIndices: number[] = [];

    for (let i = 0; i <= this.currentIndex; i++) {
      if (this.playedIndices.has(i)) {
        playedSongs.push(this.queue[i]);
        playedOriginalIndices.push(i);
      }
    }

    const remainingAfterCurrent = this.queue.slice(this.currentIndex + 1);

    this.queue = [...playedSongs, ...remainingAfterCurrent];
    this.currentIndex = playedSongs.length - 1;

    this.playedIndices.clear();
    for (let i = 0; i < playedSongs.length; i++) {
      this.playedIndices.add(i);
    }

    if (!this.shuffled) {
      this.originalQueue = [...this.queue];
    }
  }

  /**
   * Enforces an upper bound on the in-memory playback queue size while preserving
   * the currently playing song and a minimum number of upcoming songs.
   *
   * This method may remove older songs that appear before the current index when
   * the queue grows beyond {@link maxSize}. It ensures that at least a fixed
   * minimum number of songs (defined internally) remain after the current song.
   * When truncation occurs, it:
   * - Slices {@link this.queue} to drop excess songs before the current song.
   * - Keeps {@link this.originalQueue} in sync when the queue is not shuffled.
   * - Adjusts {@link this.currentIndex} so it continues to point to the same
   *   logical song within the truncated queue.
   *
   * @param maxSize - Maximum allowed number of songs to keep in the queue.
   */
  private truncateQueue(maxSize: number = 20) {
    if (this.queue.length <= maxSize) return;

    const minAfterCurrent = 10;
    const songsAfterCurrent = this.queue.length - this.currentIndex - 1;

    if (songsAfterCurrent >= minAfterCurrent) {
      const maxAllowedBefore = maxSize - minAfterCurrent - 1;
      const songsBeforeCurrent = this.currentIndex;

      if (songsBeforeCurrent > maxAllowedBefore) {
        const startIndex = songsBeforeCurrent - maxAllowedBefore;
        this.queue = this.queue.slice(startIndex);

        if (!this.shuffled) {
          this.originalQueue = [...this.queue];
        }

        this.currentIndex = this.currentIndex - startIndex;
      }
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

  getUpNext(limit: number = 5): Models.Song[] {
    return this.queue.slice(
      this.currentIndex + 1,
      this.currentIndex + limit + 1,
    );
  }

  next(): Models.Song | null {
    if (this.repeatMode === "one") {
      return this.getCurrentSong();
    }

    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      this.playedIndices.add(this.currentIndex);
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
      const remaining = this.queue.filter((_, i) => i !== this.currentIndex);

      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      if (currentSong) {
        this.queue = [currentSong, ...remaining];
        this.currentIndex = 0;
      } else {
        this.queue = remaining;
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
