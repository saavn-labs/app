import { AUDIO_QUALITY, STORAGE_KEYS, UI_CONFIG } from "@/constants";
import { appStorage } from "@/stores/storage";
import { storageCache } from "@/utils/cache";
import { Models } from "@saavn-labs/sdk";

type AudioQuality = keyof typeof AUDIO_QUALITY;

export class StorageService {
  async getFavorites(): Promise<Models.Song[]> {
    const cacheKey = STORAGE_KEYS.FAVORITES;

    const cached = storageCache.get(cacheKey);
    if (cached !== null) return cached;

    const data = await appStorage.getItem(cacheKey);
    const result = data ? JSON.parse(data) : [];

    storageCache.set(cacheKey, result);

    return result;
  }

  async addFavorite(song: Models.Song): Promise<void> {
    const favorites = await this.getFavorites();

    if (favorites.some((s) => s.id === song.id)) return;

    const updated = [song, ...favorites];
    await this.saveFavorites(updated);
  }

  async removeFavorite(songId: string): Promise<void> {
    const favorites = await this.getFavorites();
    const filtered = favorites.filter((s) => s.id !== songId);
    await this.saveFavorites(filtered);
  }

  async isFavorite(songId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some((s) => s.id === songId);
  }

  async getRecentSearches(): Promise<string[]> {
    const cacheKey = STORAGE_KEYS.RECENT_SEARCHES;

    const cached = storageCache.get(cacheKey);
    if (cached !== null) return cached;

    const data = await appStorage.getItem(cacheKey);
    const result = data ? JSON.parse(data) : [];

    storageCache.set(cacheKey, result);

    return result;
  }

  async addRecentSearch(query: string): Promise<void> {
    const searches = await this.getRecentSearches();
    const withoutDuplicate = searches.filter((s) => s !== query);
    const updated = [query, ...withoutDuplicate].slice(
      0,
      UI_CONFIG.MAX_RECENT_SEARCHES,
    );

    await this.saveRecentSearches(updated);
  }

  async clearRecentSearches(): Promise<void> {
    await appStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
    storageCache.delete(STORAGE_KEYS.RECENT_SEARCHES);
  }

  async removeRecentSearch(query: string): Promise<void> {
    const searches = await this.getRecentSearches();
    const filtered = searches.filter((s) => s !== query);
    await this.saveRecentSearches(filtered);
  }

  async getContentQuality(): Promise<AudioQuality> {
    const quality = await appStorage.getItem(STORAGE_KEYS.CONTENT_QUALITY);
    return quality && quality in AUDIO_QUALITY
      ? (quality as AudioQuality)
      : "MEDIUM";
  }

  async saveContentQuality(quality: AudioQuality): Promise<void> {
    await appStorage.setItem(STORAGE_KEYS.CONTENT_QUALITY, quality);
  }

  private async saveFavorites(favorites: Models.Song[]): Promise<void> {
    await appStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    storageCache.set(STORAGE_KEYS.FAVORITES, favorites);
  }

  private async saveRecentSearches(searches: string[]): Promise<void> {
    await appStorage.setItem(
      STORAGE_KEYS.RECENT_SEARCHES,
      JSON.stringify(searches),
    );
    storageCache.set(STORAGE_KEYS.RECENT_SEARCHES, searches);
  }
}

export const storageService = new StorageService();
