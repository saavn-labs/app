import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./storage";

interface UIState {
  isFullPlayerVisible: boolean;
  activeTab: string;
  selectedTab: string;
  modalType: string | null;
  menuVisible: string | null;
  settingsModalVisible: boolean;
  refreshing: boolean;
  error: string | null;
  setFullPlayerVisible: (visible: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedTab: (tab: string) => void;
  setModalType: (type: string | null) => void;
  setMenuVisible: (id: string | null) => void;
  setSettingsModalVisible: (visible: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
  resetUIState: () => void;
}

const initialState = {
  isFullPlayerVisible: false,
  activeTab: "songs",
  selectedTab: "songs",
  modalType: null,
  menuVisible: null,
  settingsModalVisible: false,
  refreshing: false,
  error: null,
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...initialState,
      setFullPlayerVisible: (visible: boolean) =>
        set({ isFullPlayerVisible: visible }),
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setSelectedTab: (tab: string) => set({ selectedTab: tab }),
      setModalType: (type: string | null) => set({ modalType: type }),
      setMenuVisible: (id: string | null) => set({ menuVisible: id }),
      setSettingsModalVisible: (visible: boolean) =>
        set({ settingsModalVisible: visible }),
      setRefreshing: (refreshing: boolean) => set({ refreshing }),
      setError: (error: string | null) => set({ error }),
      resetUIState: () => set(initialState),
    }),
    {
      name: "ui-store",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        selectedTab: state.selectedTab,
      }),
    },
  ),
);
