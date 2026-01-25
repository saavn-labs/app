import { Collection, collectionService, storageService } from "@/services";
import { Models } from "@saavn-labs/sdk";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface LibraryState {
  favorites: Models.Song[];
  collections: Collection[];
  selectedCollection: Collection | null;
  activeTab: "songs" | "collections";
  loading: boolean;
  error: string | null;
  initialized: boolean;
  loadLibrary: () => Promise<boolean>;
  refreshFavorites: () => Promise<boolean>;
  refreshCollections: () => Promise<boolean>;
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (song: Models.Song) => Promise<boolean>;
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
  setActiveTab: (tab: "songs" | "collections") => void;
  clearError: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      collections: [],
      selectedCollection: null,
      activeTab: "songs",
      loading: false,
      error: null,
      initialized: false,

      loadLibrary: async () => {
        set({ loading: true, error: null });
        try {
          const [favorites, collections] = await Promise.all([
            storageService.getFavorites(),
            collectionService.getCollections(),
          ]);

          set({
            favorites,
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
          set({ favorites, error: null });
          return true;
        } catch (error) {
          set({ error: "Failed to refresh favorites" });
          console.error("[LibraryStore] refreshFavorites failed", error);
          return false;
        }
      },

      refreshCollections: async () => {
        try {
          const collections = await collectionService.getCollections();
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

      addToCollection: async (collectionId, song) => {
        try {
          await collectionService.addToCollection(collectionId, song);
          const collections = await collectionService.getCollections();
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
          const collections = await collectionService.getCollections();
          set({ collections, error: null });
          return collection;
        } catch (error) {
          set({ error: "Failed to create collection" });
          console.error("[LibraryStore] createCollection failed", error);
          return null;
        }
      },

      renameCollection: async (collectionId, name) => {
        try {
          await collectionService.renameCollection(collectionId, name);
          const collections = await collectionService.getCollections();
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
        try {
          await collectionService.deleteCollection(collectionId);
          const collections = await collectionService.getCollections();
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
        collections: state.collections,
        activeTab: state.activeTab,
      }),
    },
  ),
);
