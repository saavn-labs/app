import AsyncStorage from "@react-native-async-storage/async-storage";
import { Models } from "@saavn-labs/sdk";

const HISTORY_KEY = "@playback_history";

export interface HistoryEntry {
  song: Models.Song;
  playedAt: string;
  duration: number; // How long the song was played (in seconds)
}

export class HistoryService {
  async getHistory(): Promise<HistoryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting history:", error);
      return [];
    }
  }

  async addToHistory(song: Models.Song, duration: number = 0): Promise<void> {
    try {
      const history = await this.getHistory();

      // Check if song was recently added (within last 5 minutes)
      const recentEntryIndex = history.findIndex(
        (entry) =>
          entry.song.id === song.id &&
          Date.now() - new Date(entry.playedAt).getTime() < 5 * 60 * 1000,
      );

      if (recentEntryIndex !== -1) {
        // Update existing recent entry with new timestamp
        history[recentEntryIndex] = {
          ...history[recentEntryIndex],
          playedAt: new Date().toISOString(),
          duration,
        };
      } else {
        // Create new entry
        const entry: HistoryEntry = {
          song,
          playedAt: new Date().toISOString(),
          duration,
        };

        // Add to beginning and limit to 500 entries
        history.unshift(entry);
        const limited = history.slice(0, 500);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
        return;
      }

      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Error adding to history:", error);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  }

  async removeFromHistory(songId: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filtered = history.filter((entry) => entry.song.id !== songId);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error removing from history:", error);
    }
  }
}

export const historyService = new HistoryService();
