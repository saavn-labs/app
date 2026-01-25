import {
  SearchCategory,
  SearchResults,
  searchService,
  storageService,
} from "@/services";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface LoadingStates {
  songs: boolean;
  albums: boolean;
  artists: boolean;
  playlists: boolean;
}

interface SearchState {
  searchQuery: string;
  isFocused: boolean;
  isListening: boolean;
  transcript: string;
  voiceError: string | null;
  voiceAvailable: boolean;
  activeTab: SearchCategory | null;
  results: SearchResults;
  loadingStates: LoadingStates;
  error: string | null;
  recentSearches: string[];
  setSearchQuery: (query: string) => void;
  setIsFocused: (focused: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setTranscript: (transcript: string) => void;
  setVoiceError: (error: string | null) => void;
  setVoiceAvailable: (available: boolean) => void;
  setActiveTab: (tab: SearchCategory | null) => void;
  loadRecentSearches: () => Promise<void>;
  removeRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  executeSearch: (query: string, tab: SearchCategory | null) => Promise<void>;
  cancelSearch: () => void;
  clearSearchResults: () => void;
}

const initialResults: SearchResults = {
  songs: [],
  albums: [],
  artists: [],
  playlists: [],
};

const initialLoadingStates: LoadingStates = {
  songs: false,
  albums: false,
  artists: false,
  playlists: false,
};

const SEARCH_LIMIT = 50;
let activeAbortController: AbortController | null = null;

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      searchQuery: "",
      isFocused: false,
      isListening: false,
      transcript: "",
      voiceError: null,
      voiceAvailable: true,
      activeTab: null,
      results: initialResults,
      loadingStates: initialLoadingStates,
      error: null,
      recentSearches: [],

      setSearchQuery: (query: string) => set({ searchQuery: query }),
      setIsFocused: (focused: boolean) => set({ isFocused: focused }),
      setIsListening: (listening: boolean) => set({ isListening: listening }),
      setTranscript: (transcript: string) => set({ transcript }),
      setVoiceError: (error: string | null) => set({ voiceError: error }),
      setVoiceAvailable: (available: boolean) =>
        set({ voiceAvailable: available }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      loadRecentSearches: async () => {
        try {
          const recentSearches = await storageService.getRecentSearches();
          set({ recentSearches });
        } catch (error) {
          console.error("[SearchStore] loadRecentSearches failed", error);
        }
      },

      removeRecentSearch: async (query: string) => {
        try {
          await storageService.removeRecentSearch(query);
          const recentSearches = await storageService.getRecentSearches();
          set({ recentSearches });
        } catch (error) {
          console.error("[SearchStore] removeRecentSearch failed", error);
        }
      },

      clearRecentSearches: async () => {
        try {
          await storageService.clearRecentSearches();
          set({ recentSearches: [] });
        } catch (error) {
          console.error("[SearchStore] clearRecentSearches failed", error);
        }
      },

      executeSearch: async (query, tab) => {
        const trimmed = query.trim();
        set({ searchQuery: query });

        if (trimmed.length < 2) {
          activeAbortController?.abort();
          set({
            results: initialResults,
            loadingStates: initialLoadingStates,
            error: null,
          });
          return;
        }

        activeAbortController?.abort();
        const controller = new AbortController();
        activeAbortController = controller;

        try {
          set({ error: null });
          const currentLoading = get().loadingStates;

          if (tab === null) {
            set({
              loadingStates: {
                songs: true,
                albums: true,
                artists: true,
                playlists: true,
              },
              results: initialResults,
            });

            await storageService.addRecentSearch(trimmed);
            const recentSearches = await storageService.getRecentSearches();
            if (!controller.signal.aborted) {
              set({ recentSearches });
            }

            const results = await searchService.searchAll(
              trimmed,
              controller.signal,
            );
            if (!controller.signal.aborted) {
              set({ results });
            }

            if (!controller.signal.aborted) {
              set({ loadingStates: initialLoadingStates });
            }
          } else {
            set({
              loadingStates: { ...currentLoading, [tab]: true },
            });

            await storageService.addRecentSearch(trimmed);
            const recentSearches = await storageService.getRecentSearches();
            if (!controller.signal.aborted) {
              set({ recentSearches });
            }

            const result = await searchService.searchCategory(
              trimmed,
              tab,
              SEARCH_LIMIT,
              controller.signal,
            );

            if (!controller.signal.aborted) {
              set((state) => ({
                results: { ...state.results, [tab]: result as any },
                loadingStates: { ...state.loadingStates, [tab]: false },
              }));
            }
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            set({
              error: "Search failed",
              loadingStates: initialLoadingStates,
            });
            console.error("[SearchStore] executeSearch failed", error);
          }
        }
      },

      cancelSearch: () => {
        activeAbortController?.abort();
      },

      clearSearchResults: () =>
        set({
          results: initialResults,
          loadingStates: initialLoadingStates,
          error: null,
        }),
    }),
    {
      name: "search-storage",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
);
