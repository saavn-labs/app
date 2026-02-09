import {
  type DownloadedTrack,
  type DownloadProgress,
  downloadService,
} from "@/services/DownloadService";
import { Models } from "@saavn-labs/sdk";
import { create } from "zustand";

interface DownloadsState {
  downloads: DownloadedTrack[];
  activeDownloads: Map<string, DownloadProgress>;
  isLoading: boolean;
  error: string | null;

  loadDownloads: () => Promise<void>;
  downloadTrack: (track: Models.Song) => Promise<void>;
  deleteDownload: (songId: string) => Promise<void>;
  deleteAllDownloads: () => Promise<void>;
  cleanupOrphans: () => Promise<void>;
  exportTracks: (songIds: string[]) => Promise<void>;

  isDownloaded: (songId: string) => boolean;
  getDownloadInfo: (songId: string) => DownloadedTrack | null;
  getProgress: (songId: string) => DownloadProgress | null;
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  activeDownloads: new Map(),
  isLoading: false,
  error: null,

  loadDownloads: async () => {
    set({ isLoading: true, error: null });
    try {
      const downloads = await downloadService.getDownloadedTracks();
      set({ downloads, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to load downloads",
      });
    }
  },

  downloadTrack: async (track: Models.Song) => {
    const { activeDownloads, isDownloaded } = get();

    if (activeDownloads.has(track.id)) {
      throw new Error("Download already in progress");
    }

    if (isDownloaded(track.id)) {
      throw new Error("Track already downloaded");
    }

    set({ error: null });

    try {
      await downloadService.downloadTrack(track, (progress) => {
        set((state) => {
          const newMap = new Map(state.activeDownloads);
          newMap.set(track.id, progress);
          return { activeDownloads: newMap };
        });
      });

      await get().loadDownloads();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Download failed",
      });
      throw error;
    } finally {
      set((state) => {
        const newMap = new Map(state.activeDownloads);
        newMap.delete(track.id);
        return { activeDownloads: newMap };
      });
    }
  },

  deleteDownload: async (songId: string) => {
    set({ error: null });
    try {
      await downloadService.deleteDownload(songId);
      set((state) => ({
        downloads: state.downloads.filter((d) => d.id !== songId),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete",
      });
      throw error;
    }
  },

  deleteAllDownloads: async () => {
    set({ error: null });
    try {
      await downloadService.deleteAllDownloads();
      set({ downloads: [], activeDownloads: new Map() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete all",
      });
      throw error;
    }
  },

  cleanupOrphans: async () => {
    set({ error: null });
    try {
      await downloadService.cleanupOrphans();
      await get().loadDownloads();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Cleanup failed" });
      throw error;
    }
  },

  exportTracks: async (songIds: string[]) => {
    set({ error: null });
    try {
      await downloadService.exportTracks(songIds);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Export failed",
      });
      throw error;
    }
  },

  isDownloaded: (songId: string) => {
    return get().downloads.some((d) => d.id === songId);
  },

  getDownloadInfo: (songId: string) => {
    return get().downloads.find((d) => d.id === songId) || null;
  },

  getProgress: (songId: string) => {
    return get().activeDownloads.get(songId) || null;
  },
}));
