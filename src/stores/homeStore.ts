import { AUDIO_QUALITY, UI_CONFIG } from "@/constants";
import { homeService, storageService } from "@/services";
import { Models } from "@saavn-labs/sdk";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface QuickPickItem {
  id: string;
  title: string;
  imageUrl: string;
  type: "album" | "playlist";
}

interface Section {
  title: string;
  data: Models.Song[] | Models.Album[] | Models.Playlist[];
  type: "albums" | "playlists" | "songs";
}

interface HomeState {
  sections: Section[];
  loading: boolean;
  selectedLanguage: string;
  quickPicks: QuickPickItem[];
  settingsModalVisible: boolean;
  contentQuality: keyof typeof AUDIO_QUALITY;
  error: string | null;
  loadPreferences: () => Promise<void>;
  loadHomeData: (language?: string) => Promise<void>;
  setSelectedLanguage: (language: string) => void;
  setSettingsModalVisible: (visible: boolean) => void;
  setContentQuality: (quality: keyof typeof AUDIO_QUALITY) => Promise<void>;
  clearError: () => void;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      sections: [],
      loading: false,
      selectedLanguage: "hindi",
      quickPicks: [],
      settingsModalVisible: false,
      contentQuality: "MEDIUM",
      error: null,

      loadPreferences: async () => {
        try {
          const quality = await storageService.getContentQuality();
          set({ contentQuality: quality, error: null });
        } catch (error) {
          set({ error: "Failed to load preferences" });
          console.error("[HomeStore] loadPreferences failed", error);
        }
      },

      loadHomeData: async (language) => {
        const lang = language ?? get().selectedLanguage;
        set({ loading: true, error: null });

        try {
          const { trendingAlbums, trendingPlaylists, trendingSongs } =
            await homeService.fetchHomeData(lang);

          const quickPicks: QuickPickItem[] = [
            ...trendingAlbums.slice(0, 3).map((album) => ({
              id: album.id,
              title: album.title,
              imageUrl: album.images?.[1]?.url || album.images?.[0]?.url || "",
              type: "album" as const,
            })),
            ...trendingPlaylists.slice(0, 3).map((playlist) => ({
              id: playlist.id,
              title: playlist.title,
              imageUrl:
                playlist.images?.[1]?.url || playlist.images?.[0]?.url || "",
              type: "playlist" as const,
            })),
          ].slice(0, UI_CONFIG.HOME_QUICK_PICKS_LIMIT);

          const sections: Section[] = [
            {
              title: "Trending Now",
              data: trendingSongs.slice(0, UI_CONFIG.HOME_TRENDING_SONGS_LIMIT),
              type: "songs" as const,
            },
            {
              title: "Popular Albums",
              data: trendingAlbums.slice(0, UI_CONFIG.HOME_TRENDING_LIMIT),
              type: "albums" as const,
            },
            {
              title: "Top Playlists",
              data: trendingPlaylists.slice(0, UI_CONFIG.HOME_TRENDING_LIMIT),
              type: "playlists" as const,
            },
          ].filter((section) => section.data.length > 0);

          set({ sections, quickPicks, loading: false, error: null });
        } catch (error) {
          set({ loading: false, error: "Failed to load home data" });
          console.error("[HomeStore] loadHomeData failed", error);
        }
      },

      setSelectedLanguage: (language) => set({ selectedLanguage: language }),

      setSettingsModalVisible: (visible) =>
        set({ settingsModalVisible: visible }),

      setContentQuality: async (quality) => {
        try {
          await storageService.saveContentQuality(quality);
          set({ contentQuality: quality, error: null });
        } catch (error) {
          set({ error: "Failed to save content quality" });
          console.error("[HomeStore] setContentQuality failed", error);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "home-storage",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        selectedLanguage: state.selectedLanguage,
        contentQuality: state.contentQuality,
      }),
    },
  ),
);
