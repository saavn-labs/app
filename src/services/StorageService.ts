import AsyncStorage from "@react-native-async-storage/async-storage";
import { Models } from "@saavn-labs/sdk";

const KEYS = {
  FAVORITES: "@favorites",
  RECENT_SEARCHES: "@recent_searches",
};


/**
 * StorageService - Manages favorites and recent searches
 * For collections/playlists, use CollectionService
 */
export class StorageService {
  // Favorites
  async getFavorites(): Promise<Models.Song[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting favorites:", error);
      return [];
    }
  }

  async addFavorite(song: Models.Song): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const exists = favorites.some((s) => s.id === song.id);
      if (!exists) {
        favorites.unshift(song);
        await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
    }
  }

  async removeFavorite(songId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter((s) => s.id !== songId);
      await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  }

  async isFavorite(songId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some((s) => s.id === songId);
    } catch (error) {
      console.error("Error checking favorite:", error);
      return false;
    }
  }

  // Recent Searches
  async getRecentSearches(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.RECENT_SEARCHES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting recent searches:", error);
      return [];
    }
  }

  async addRecentSearch(query: string): Promise<void> {
    try {
      const searches = await this.getRecentSearches();
      const filtered = searches.filter((s) => s !== query);
      filtered.unshift(query);
      const limited = filtered.slice(0, 10); // Keep only 10 recent searches
      await AsyncStorage.setItem(KEYS.RECENT_SEARCHES, JSON.stringify(limited));
    } catch (error) {
      console.error("Error adding recent search:", error);
    }
  }

  async clearRecentSearches(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.RECENT_SEARCHES);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  }
}

export const storageService = new StorageService();
