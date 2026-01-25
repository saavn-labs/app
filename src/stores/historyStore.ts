import { HistorySection, historyService } from "@/services";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface HistoryState {
  sections: HistorySection[];
  loading: boolean;
  error: string | null;
  loadHistory: () => Promise<boolean>;
  removeHistoryEntry: (songId: string) => Promise<boolean>;
  clearHistory: () => Promise<boolean>;
  clearError: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      sections: [],
      loading: false,
      error: null,

      loadHistory: async () => {
        set({ loading: true, error: null });
        try {
          const sections = await historyService.getHistorySections();
          set({ sections, loading: false });
          return true;
        } catch (error) {
          set({
            error: "Failed to load history",
            loading: false,
            sections: [],
          });
          console.error("[HistoryStore] loadHistory failed", error);
          return false;
        }
      },

      removeHistoryEntry: async (songId: string) => {
        try {
          await historyService.removeFromHistory(songId);
          const sections = await historyService.getHistorySections();
          set({ sections, error: null });
          return true;
        } catch (error) {
          set({ error: "Failed to remove history entry" });
          console.error("[HistoryStore] removeHistoryEntry failed", error);
          return false;
        }
      },

      clearHistory: async () => {
        try {
          await historyService.clearHistory();
          set({ sections: [], error: null });
          return true;
        } catch (error) {
          set({ error: "Failed to clear history" });
          console.error("[HistoryStore] clearHistory failed", error);
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "history-storage",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ sections: state.sections }),
    },
  ),
);
