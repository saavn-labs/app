import { AUDIO_QUALITY, STORAGE_KEYS, UI_CONFIG } from "@/constants";
import { storageCache } from "@/utils/cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Models } from "@saavn-labs/sdk";

/**
 * StorageService - Manages favorites, recent searches, and user preferences
 * For collections/playlists, use CollectionService
 */
export class StorageService {
  async getFavorites(): Promise<Models.Song[]> {
    try {
      // Check cache first
      const cached = storageCache.get(STORAGE_KEYS.FAVORITES);
      if (cached) return cached;

      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      const favorites = data ? JSON.parse(data) : [];

      // Update cache
      storageCache.set(STORAGE_KEYS.FAVORITES, favorites);

      return favorites;
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
        await AsyncStorage.setItem(
          STORAGE_KEYS.FAVORITES,
          JSON.stringify(favorites),
        );
        // Update cache
        storageCache.set(STORAGE_KEYS.FAVORITES, favorites);
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
    }
  }

  async removeFavorite(songId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter((s) => s.id !== songId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAVORITES,
        JSON.stringify(filtered),
      );
      // Update cache
      storageCache.set(STORAGE_KEYS.FAVORITES, filtered);
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

  async getRecentSearches(): Promise<string[]> {
    try {
      // Check cache first
      const cached = storageCache.get(STORAGE_KEYS.RECENT_SEARCHES);
      if (cached) return cached;

      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      const searches = data ? JSON.parse(data) : [];

      // Update cache
      storageCache.set(STORAGE_KEYS.RECENT_SEARCHES, searches);

      return searches;
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
      const limited = filtered.slice(0, UI_CONFIG.MAX_RECENT_SEARCHES);
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_SEARCHES,
        JSON.stringify(limited),
      );
      // Update cache
      storageCache.set(STORAGE_KEYS.RECENT_SEARCHES, limited);
    } catch (error) {
      console.error("Error adding recent search:", error);
    }
  }

  async clearRecentSearches(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
      // Clear cache
      storageCache.delete(STORAGE_KEYS.RECENT_SEARCHES);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  }

  async getContentQuality(): Promise<keyof typeof AUDIO_QUALITY> {
    try {
      const quality = await AsyncStorage.getItem(STORAGE_KEYS.CONTENT_QUALITY);
      return (quality as keyof typeof AUDIO_QUALITY) || "MEDIUM";
    } catch (error) {
      console.error("Error getting content quality:", error);
      return "MEDIUM";
    }
  }

  async saveContentQuality(quality: keyof typeof AUDIO_QUALITY): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONTENT_QUALITY, quality);
    } catch (error) {
      console.error("Error saving content quality:", error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
