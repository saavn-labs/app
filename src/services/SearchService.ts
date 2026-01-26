import { Album, Artist, Extras, Models, Playlist, Song } from "@saavn-labs/sdk";

export type SearchCategory = "songs" | "albums" | "artists" | "playlists";

export interface SearchResults {
  songs: Models.Song[];
  albums: Models.Album[];
  artists: Models.Artist[];
  playlists: Models.Playlist[];
}

const EMPTY_RESULTS: SearchResults = {
  songs: [],
  albums: [],
  artists: [],
  playlists: [],
};

export class SearchService {
  constructor(private readonly defaultLimit = 50) {}

  async searchAll(query: string, signal?: AbortSignal): Promise<SearchResults> {
    const trimmed = query.trim();
    if (trimmed.length < 2 || signal?.aborted) return EMPTY_RESULTS;

    const result = await Extras.searchAll({ query: trimmed });
    if (signal?.aborted) return EMPTY_RESULTS;

    return {
      songs: (result.songs?.data as Models.Song[]) || [],
      albums: (result.albums?.data as Models.Album[]) || [],
      artists: (result.artists?.data as Models.Artist[]) || [],
      playlists: (result.playlists?.data as Models.Playlist[]) || [],
    };
  }

  async searchCategory(
    query: string,
    category: SearchCategory,
    limit = this.defaultLimit,
    signal?: AbortSignal,
  ): Promise<
    Models.Song[] | Models.Album[] | Models.Artist[] | Models.Playlist[]
  > {
    const trimmed = query.trim();
    if (trimmed.length < 2 || signal?.aborted) return [];

    const searchMap: Record<SearchCategory, () => Promise<any>> = {
      songs: () => Song.search({ query: trimmed, limit }),
      albums: () => Album.search({ query: trimmed, limit }),
      artists: () => Artist.search({ query: trimmed, limit }),
      playlists: () => Playlist.search({ query: trimmed, limit }),
    };

    const result = await searchMap[category]();
    return result.results || [];
  }
}

export const searchService = new SearchService();
