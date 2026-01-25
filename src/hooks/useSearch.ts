import { Album, Artist, Models, Playlist, Song } from "@saavn-labs/sdk";
import { useState } from "react";

interface SearchResults {
  songs: Models.Song[];
  albums: Models.Album[];
  artists: Models.Artist[];
  playlists: Models.Playlist[];
}

export const useSearch = () => {
  const [results, setResults] = useState<SearchResults>({
    songs: [],
    albums: [],
    artists: [],
    playlists: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = async (query: string, limit: number = 20) => {
    if (query.trim().length < 2) {
      setResults({ songs: [], albums: [], artists: [], playlists: [] });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [songsResult, albumsResult, artistsResult, playlistsResult] =
        await Promise.all([
          Song.search({ query, limit }).catch(() => ({
            results: [],
            total: 0,
          })),
          Album.search({ query, limit }).catch(() => ({
            results: [],
            total: 0,
          })),
          Artist.search({ query, limit }).catch(() => ({
            results: [],
            total: 0,
          })),
          Playlist.search({ query, limit }).catch(() => ({
            results: [],
            total: 0,
          })),
        ]);

      setResults({
        songs: songsResult.results,
        albums: albumsResult.results,
        artists: artistsResult.results,
        playlists: playlistsResult.results,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Search failed"));
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchSongs = async (query: string, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      const result = await Song.search({ query, limit });
      setResults((prev) => ({ ...prev, songs: result.results }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Song search failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchAlbums = async (query: string, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      const result = await Album.search({ query, limit });
      setResults((prev) => ({ ...prev, albums: result.results }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Album search failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchArtists = async (query: string, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      const result = await Artist.search({ query, limit });
      setResults((prev) => ({ ...prev, artists: result.results }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Artist search failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchPlaylists = async (query: string, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      const result = await Playlist.search({ query, limit });
      setResults((prev) => ({ ...prev, playlists: result.results }));
      return result;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Playlist search failed"),
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResults({ songs: [], albums: [], artists: [], playlists: [] });
    setError(null);
  };

  return {
    results,
    loading,
    error,
    search,
    searchSongs,
    searchAlbums,
    searchArtists,
    searchPlaylists,
    clear,
  };
};
