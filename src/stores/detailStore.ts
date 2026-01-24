import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface DetailState {
  selectedTab: "songs" | "albums";
  isFullPlayerVisible: boolean;
  setSelectedTab: (tab: "songs" | "albums") => void;
  setFullPlayerVisible: (visible: boolean) => void;
}

export const useDetailStore = create<DetailState>()(
  persist(
    (set) => ({
      selectedTab: "songs",
      isFullPlayerVisible: false,
      setSelectedTab: (tab: "songs" | "albums") => set({ selectedTab: tab }),
      setFullPlayerVisible: (visible: boolean) =>
        set({ isFullPlayerVisible: visible }),
    }),
    {
      name: "detail-store",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        selectedTab: state.selectedTab,
      }),
    },
  ),
);
