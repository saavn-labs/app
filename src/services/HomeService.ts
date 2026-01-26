import { storageCache } from "@/utils/cache";
import { Album, Playlist, Song } from "@saavn-labs/sdk";

export interface HomeData {
  trendingAlbums: Awaited<ReturnType<typeof Album.getTrending>>;
  trendingPlaylists: Awaited<ReturnType<typeof Playlist.getTrending>>;
  trendingSongs: Awaited<ReturnType<typeof Song.getTrending>>;
}

export class HomeService {
  async fetchHomeData(language: string): Promise<HomeData> {
    const cacheKey = `home_${language}`;

    const cached = storageCache.get(cacheKey);
    if (cached !== null) return cached;

    const [trendingAlbums, trendingPlaylists, trendingSongs] =
      await Promise.all([
        Album.getTrending({ language }),
        Playlist.getTrending({ language }),
        Song.getTrending({ language }),
      ]);

    const result = { trendingAlbums, trendingPlaylists, trendingSongs };

    storageCache.set(cacheKey, result);

    return result;
  }
}

export const homeService = new HomeService();
