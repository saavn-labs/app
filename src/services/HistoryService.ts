import { appStorage } from "@/stores/storage";
import { Models } from "@saavn-labs/sdk";

const HISTORY_KEY = "@playback_history";
const MAX_HISTORY_ENTRIES = 500;
const RECENT_ENTRY_THRESHOLD_MS = 5 * 60 * 1000;

export interface HistoryEntry {
  song: Models.Song;
  playedAt: string;
  duration: number;
}

export interface HistorySection {
  title: string;
  data: HistoryEntry[];
}

export class HistoryService {
  async getHistory(): Promise<HistoryEntry[]> {
    const data = await appStorage.getItem(HISTORY_KEY);
    if (!data) return [];

    const parsed: HistoryEntry[] = JSON.parse(data);
    const deduplicated = this.deduplicateHistory(parsed);

    if (deduplicated.length !== parsed.length) {
      await this.saveHistory(deduplicated);
    }

    return deduplicated;
  }

  async addToHistory(song: Models.Song, duration = 0): Promise<void> {
    const history = await this.getHistory();
    const recentEntryIndex = this.findRecentEntry(history, song.id);

    const updatedHistory =
      recentEntryIndex !== -1
        ? this.updateRecentEntry(history, recentEntryIndex, duration)
        : this.addNewEntry(history, song, duration);

    await this.saveHistory(updatedHistory);
  }

  async clearHistory(): Promise<void> {
    await appStorage.removeItem(HISTORY_KEY);
  }

  async getHistorySections(): Promise<HistorySection[]> {
    const history = await this.getHistory();
    return this.groupHistoryByDate(history);
  }

  async removeFromHistory(songId: string): Promise<void> {
    const history = await this.getHistory();
    const filtered = history.filter((entry) => entry.song.id !== songId);
    await this.saveHistory(filtered);
  }

  private deduplicateHistory(entries: HistoryEntry[]): HistoryEntry[] {
    const seen = new Set<string>();
    const deduplicated: HistoryEntry[] = [];

    for (const entry of entries) {
      if (!seen.has(entry.song.id)) {
        seen.add(entry.song.id);
        deduplicated.push(entry);
      }
    }

    return deduplicated;
  }

  private findRecentEntry(history: HistoryEntry[], songId: string): number {
    const now = Date.now();

    return history.findIndex((entry) => {
      if (entry.song.id !== songId) return false;
      const playedAt = new Date(entry.playedAt).getTime();
      return now - playedAt < RECENT_ENTRY_THRESHOLD_MS;
    });
  }

  private updateRecentEntry(
    history: HistoryEntry[],
    index: number,
    duration: number,
  ): HistoryEntry[] {
    const updated = [...history];
    updated[index] = {
      ...updated[index],
      playedAt: new Date().toISOString(),
      duration,
    };
    return updated;
  }

  private addNewEntry(
    history: HistoryEntry[],
    song: Models.Song,
    duration: number,
  ): HistoryEntry[] {
    const newEntry: HistoryEntry = {
      song,
      playedAt: new Date().toISOString(),
      duration,
    };

    const withoutDuplicates = history.filter((h) => h.song.id !== song.id);
    const withNewEntry = [newEntry, ...withoutDuplicates];

    return withNewEntry.slice(0, MAX_HISTORY_ENTRIES);
  }

  private groupHistoryByDate(history: HistoryEntry[]): HistorySection[] {
    if (!history.length) return [];

    const sorted = [...history].sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
    );

    const sections = new Map<string, HistorySection>();
    const today = this.toDayStart(new Date());
    const yesterday = this.toDayStart(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );

    for (const entry of sorted) {
      const playedDate = new Date(entry.playedAt);
      const dayStart = this.toDayStart(playedDate);

      let title: string;
      if (dayStart === today) {
        title = "Today";
      } else if (dayStart === yesterday) {
        title = "Yesterday";
      } else {
        title = playedDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }

      const existing = sections.get(title);
      if (existing) {
        existing.data.push(entry);
      } else {
        sections.set(title, { title, data: [entry] });
      }
    }

    return Array.from(sections.values());
  }

  private toDayStart(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private async saveHistory(history: HistoryEntry[]): Promise<void> {
    await appStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export const historyService = new HistoryService();
