import {
    Collection,
    SavedAlbum,
    SavedPlaylist,
    collectionService,
    storageService,
} from "@/services";
import { downloadService } from "@/services/DownloadService";
import { Models } from "@saavn-labs/sdk";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

const LIKED_SONGS_COLLECTION_ID = "system-liked-songs";
const LOCAL_FILES_COLLECTION_ID = "system-local-files";

const buildSystemCollections = (
  favorites: Models.Song[],
  localFiles: Models.Song[],
): Collection[] => {
  const now = new Date().toISOString();
  return [
    {
      id: LIKED_SONGS_COLLECTION_ID,
      name: "Liked Songs",
      songs: favorites,
      createdAt: now,
      updatedAt: now,
      coverUrl: favorites[0]?.images?.[0]?.url,
    },
    {
      id: LOCAL_FILES_COLLECTION_ID,
      name: "Local Files",
      songs: localFiles,
      createdAt: now,
      updatedAt: now,
      coverUrl: localFiles[0]?.images?.[0]?.url,
    },
  ];
};

const mergeCollections = (
  favorites: Models.Song[],
  localFiles: Models.Song[],
  userCollections: Collection[],
): Collection[] => [
  ...buildSystemCollections(favorites, localFiles),
  ...userCollections,
];

const isSystemCollection = (collectionId: string): boolean =>
  collectionId === LIKED_SONGS_COLLECTION_ID ||
  collectionId === LOCAL_FILES_COLLECTION_ID;

interface LibraryState {
  favorites: Models.Song[];
  savedAlbums: SavedAlbum[];
  savedPlaylists: SavedPlaylist[];
  collections: Collection[];
  selectedCollection: Collection | null;
  activeTab: "collections" | "media";
  loading: boolean;
  error: string | null;
  initialized: boolean;
  loadLibrary: () => Promise<boolean>;
  refreshFavorites: () => Promise<boolean>;
  refreshCollections: () => Promise<boolean>;
  refreshSavedMedia: () => Promise<boolean>;
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (song: Models.Song) => Promise<boolean>;
  isAlbumSaved: (albumId: string) => boolean;
  toggleSavedAlbum: (album: Models.Album) => Promise<boolean>;
  isPlaylistSaved: (playlistId: string) => boolean;
  toggleSavedPlaylist: (playlist: Models.Playlist) => Promise<boolean>;
  addToCollection: (
    collectionId: string,
    song: Models.Song,
  ) => Promise<boolean>;
  createCollection: (
    name: string,
    description?: string,
  ) => Promise<Collection | null>;
  renameCollection: (collectionId: string, name: string) => Promise<boolean>;
  deleteCollection: (collectionId: string) => Promise<boolean>;
  setSelectedCollection: (collection: Collection | null) => void;
  setActiveTab: (tab: "collections" | "media") => void;
  clearError: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      savedAlbums: [],
      savedPlaylists: [],
      collections: [],
      selectedCollection: null,
      activeTab: "collections",
      loading: false,
      error: null,
      initialized: false,

      loadLibrary: async () => {
        set({ loading: true, error: null });
        try {
          const [
            favorites,
            savedAlbums,
            savedPlaylists,
            userCollections,
            downloads,
          ] = await Promise.all([
            storageService.getFavorites(),
            storageService.getSavedAlbums(),
            storageService.getSavedPlaylists(),
            collectionService.getCollections(),
            downloadService.getDownloadedTracks(),
          ]);

          const localFiles = downloads.map((download) => download.song);
          const collections = mergeCollections(
            favorites,
            localFiles,
            userCollections,
          );

          set({
            favorites,
            savedAlbums,
            savedPlaylists,
            collections,
            loading: false,
            initialized: true,
            error: null,
          });
          return true;
        } catch (error) {
          set({ loading: false, error: "Failed to load library" });
          console.error("[LibraryStore] loadLibrary failed", error);
          return false;
        }
      },

      refreshFavorites: async () => {
        try {
          const favorites = await storageService.getFavorites();
          const downloads = await downloadService.getDownloadedTracks();
          const localFiles = downloads.map((download) => download.song);
          const userCollections = await collectionService.getCollections();
          const collections = mergeCollections(
            favorites,
            localFiles,
            userCollections,
          );

          const { selectedCollection } = get();
          const updatedSelection = selectedCollection
            ? (collections.find((c) => c.id === selectedCollection.id) ?? null)
            : null;

          set({
            favorites,
            collections,
            selectedCollection: updatedSelection,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: "Failed to refresh favorites" });
          console.error("[LibraryStore] refreshFavorites failed", error);
          return false;
        }
      },

      refreshCollections: async () => {
        try {
          const [favorites, downloads, userCollections] = await Promise.all([
            storageService.getFavorites(),
            downloadService.getDownloadedTracks(),
            collectionService.getCollections(),
          ]);
          const localFiles = downloads.map((download) => download.song);
          const collections = mergeCollections(
            favorites,
            localFiles,
            userCollections,
          );
          const { selectedCollection } = get();
          const updatedSelection = selectedCollection
            ? (collections.find((c) => c.id === selectedCollection.id) ?? null)
            : null;

          set({
            collections,
            selectedCollection: updatedSelection,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: "Failed to refresh collections" });
          console.error("[LibraryStore] refreshCollections failed", error);
          return false;
        }
      },

      refreshSavedMedia: async () => {
        try {
          const [savedAlbums, savedPlaylists] = await Promise.all([
            storageService.getSavedAlbums(),
            storageService.getSavedPlaylists(),
          ]);

          set({ savedAlbums, savedPlaylists, error: null });
          return true;
        } catch (error) {
          set({ error: "Failed to refresh saved media" });
          console.error("[LibraryStore] refreshSavedMedia failed", error);
          return false;
        }
      },

      isFavorite: (songId) => {
        const { favorites } = get();
        return favorites.some((s) => s.id === songId);
      },

      toggleFavorite: async (song) => {
        const { favorites } = get();
        const isFavorite = favorites.some((s) => s.id === song.id);

        try {
          if (isFavorite) {
            await storageService.removeFavorite(song.id);
            set({ favorites: favorites.filter((s) => s.id !== song.id) });
          } else {
            await storageService.addFavorite(song);
            set({ favorites: [song, ...favorites] });
          }
          return true;
        } catch (error) {
          set({ error: "Failed to update favorites" });
          console.error("[LibraryStore] toggleFavorite failed", error);
          return false;
        }
      },

      isAlbumSaved: (albumId) => {
        const { savedAlbums } = get();
        return savedAlbums.some((album) => album.id === albumId);
      },

      toggleSavedAlbum: async (album) => {
        const { savedAlbums } = get();
        const alreadySaved = savedAlbums.some((a) => a.id === album.id);

        try {
          if (alreadySaved) {
            await storageService.removeSavedAlbum(album.id);
          } else {
            await storageService.addSavedAlbum(album);
          }

          const updatedSavedAlbums = await storageService.getSavedAlbums();
          set({ savedAlbums: updatedSavedAlbums, error: null });
          return true;
        } catch (error) {
          set({ error: "Failed to update saved albums" });
          console.error("[LibraryStore] toggleSavedAlbum failed", error);
          return false;
        }
      },

      isPlaylistSaved: (playlistId) => {
        const { savedPlaylists } = get();
        return savedPlaylists.some((playlist) => playlist.id === playlistId);
      },

      toggleSavedPlaylist: async (playlist) => {
        const { savedPlaylists } = get();
        const alreadySaved = savedPlaylists.some((p) => p.id === playlist.id);

        try {
          if (alreadySaved) {
            await storageService.removeSavedPlaylist(playlist.id);
          } else {
            await storageService.addSavedPlaylist(playlist);
          }

          const updatedSavedPlaylists =
            await storageService.getSavedPlaylists();
          set({ savedPlaylists: updatedSavedPlaylists, error: null });
          return true;
        } catch (error) {
          set({ error: "Failed to update saved playlists" });
          console.error("[LibraryStore] toggleSavedPlaylist failed", error);
          return false;
        }
      },

      addToCollection: async (collectionId, song) => {
        if (collectionId === LIKED_SONGS_COLLECTION_ID) {
          const favorites = get().favorites;
          if (favorites.some((s) => s.id === song.id)) return true;
          return get().toggleFavorite(song);
        }

        if (collectionId === LOCAL_FILES_COLLECTION_ID) {
          return false;
        }

        try {
          await collectionService.addToCollection(collectionId, song);
          const [favorites, downloads, userCollections] = await Promise.all([
            storageService.getFavorites(),
            downloadService.getDownloadedTracks(),
            collectionService.getCollections(),
          ]);
          const localFiles = downloads.map((download) => download.song);
          const collections = mergeCollections(
            favorites,
            localFiles,
            userCollections,
          );
          const updatedSelection = collections.find(
            (c) => c.id === collectionId,
          );
          set({
            collections,
            selectedCollection: updatedSelection ?? null,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: "Failed to add to collection" });
          console.error("[LibraryStore] addToCollection failed", error);
          return false;
        }
      },

      createCollection: async (name, description) => {
        try {
          const collection = await collectionService.createCollection(
            name,
            description,
          );
          const [favorites, downloads, userCollections] = await Promise.all([
            storageService.getFavorites(),
            downloadService.getDownloadedTracks(),
            collectionService.getCollections(),
          ]);
          const localFiles = downloads.map((download) => download.song);
          const collections = mergeCollections(
            favorites,
            localFiles,
            userCollections,
          );
          set({ collections, error: null });
          return collection;
        } catch (error) {
          set({ error: "Failed to create collection" });
          console.error("[LibraryStore] createCollection failed", error);
          return null;
        }
      },

      renameCollection: async (collectionId, name) => {
        if (isSystemCollection(collectionId)) {
          return false;
        }

        try {
          await collectionService.renameCollection(collectionId, name);
          const [favorites, downloads, userCollections] = await Promise.all([
            storageService.getFavorites(),
            downloadService.getDownloadedTracks(),
            collectionService.getCollections(),
          ]);
          const localFiles = downloads.map((download) => download.song);
          const collections = mergeCollections(
            favorites,
            localFiles,
            userCollections,
          );
          const selected = get().selectedCollection;
          const updatedSelection = selected
            ? (collections.find((c) => c.id === selected.id) ?? null)
            : null;
          set({
            collections,
            selectedCollection: updatedSelection,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: "Failed to rename collection" });
          console.error("[LibraryStore] renameCollection failed", error);
          return false;
        }
      },

      deleteCollection: async (collectionId) => {
        if (isSystemCollection(collectionId)) {
          return false;
        }

        try {
          await collectionService.deleteCollection(collectionId);
          const [favorites, downloads, userCollections] = await Promise.all([
            storageService.getFavorites(),
            downloadService.getDownloadedTracks(),
            collectionService.getCollections(),
          ]);
          const localFiles = downloads.map((download) => download.song);
          const collections = mergeCollections(
            favorites,
            localFiles,
            userCollections,
          );
          const selected = get().selectedCollection;
          set({
            collections,
            selectedCollection:
              selected && selected.id === collectionId ? null : selected,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: "Failed to delete collection" });
          console.error("[LibraryStore] deleteCollection failed", error);
          return false;
        }
      },

      setSelectedCollection: (collection) =>
        set({ selectedCollection: collection }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "library-storage",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        savedAlbums: state.savedAlbums,
        savedPlaylists: state.savedPlaylists,
        collections: state.collections,
        activeTab: state.activeTab,
      }),
    },
  ),
);
