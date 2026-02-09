import { AUDIO_QUALITY, STORAGE_KEYS } from "@/constants";
import { appStorage } from "@/stores/storage";
import { Models, Song } from "@saavn-labs/sdk";

export interface DownloadedTrack {
  id: string;
  song: Models.Song;
  filePath: string;
  downloadedAt: number;
  fileSize: number;
  quality: string;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  status: "pending" | "downloading" | "completed" | "failed" | "paused";
  error?: string;
}

const DB_NAME = "sausico_downloads";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

class WebDownloadDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async saveBlob(id: string, blob: Blob): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id, blob, timestamp: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getBlob(id: string): Promise<Blob | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
    });
  }

  async deleteBlob(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllKeys(): Promise<string[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  async clear(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const webDB = new WebDownloadDB();

export class DownloadService {
  private downloadQueue: Map<string, DownloadProgress> = new Map();
  private progressCallbacks: Map<string, (progress: DownloadProgress) => void> =
    new Map();

  async getDownloadedTracks(): Promise<DownloadedTrack[]> {
    try {
      const data = await appStorage.getItem(STORAGE_KEYS.DOWNLOADS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[DownloadService] Failed to get downloads:", error);
      return [];
    }
  }

  private async saveDownloadedTracks(tracks: DownloadedTrack[]): Promise<void> {
    try {
      await appStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(tracks));
    } catch (error) {
      console.error("[DownloadService] Failed to save downloads:", error);
    }
  }

  async isDownloaded(songId: string): Promise<boolean> {
    const downloads = await this.getDownloadedTracks();
    const download = downloads.find((d) => d.id === songId);
    if (!download) return false;

    try {
      const blob = await webDB.getBlob(songId);
      return blob !== null;
    } catch {
      return false;
    }
  }

  async getDownloadInfo(songId: string): Promise<DownloadedTrack | null> {
    const downloads = await this.getDownloadedTracks();
    const download = downloads.find((d) => d.id === songId);

    if (!download) return null;

    const blob = await webDB.getBlob(songId);
    if (blob) {
      if (download.filePath.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(download.filePath);
        } catch {}
      }

      const blobUrl = URL.createObjectURL(blob);
      download.filePath = blobUrl;
    }

    return download;
  }

  async downloadTrack(
    track: Models.Song,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<DownloadedTrack> {
    const songId = track.id;

    const existing = await this.getDownloadInfo(songId);
    if (existing) {
      const blob = await webDB.getBlob(songId);
      if (blob) {
        throw new Error("Track already downloaded");
      }
    }

    if (this.downloadQueue.has(songId)) {
      throw new Error("Download already in progress");
    }

    const progress: DownloadProgress = {
      id: songId,
      progress: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      status: "pending",
    };

    this.downloadQueue.set(songId, progress);
    if (onProgress) this.progressCallbacks.set(songId, onProgress);

    try {
      progress.status = "downloading";
      this.notifyProgress(songId, progress);

      const encrypted =
        track.media?.encryptedUrl ??
        (await Song.getById({ songIds: track.id })).songs?.[0]?.media
          ?.encryptedUrl;
      if (!encrypted) throw new Error("No encrypted URL available");

      const urls = await Song.experimental.fetchStreamUrls(
        encrypted,
        "edge",
        true,
      );

      const qualityKey =
        ((await appStorage.getItem(STORAGE_KEYS.CONTENT_QUALITY)) as string) ||
        "MEDIUM";
      const qualityIndex =
        AUDIO_QUALITY[qualityKey.toUpperCase() as keyof typeof AUDIO_QUALITY] ??
        AUDIO_QUALITY.MEDIUM;

      const streamUrl = urls?.[qualityIndex]?.url;
      if (!streamUrl) throw new Error("No streaming URL available");

      const response = await fetch(streamUrl);
      if (!response.ok) throw new Error("Failed to download track");

      const totalBytes = parseInt(
        response.headers.get("content-length") || "0",
      );
      progress.totalBytes = totalBytes;

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const chunks: BlobPart[] = [];
      let downloadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value as BlobPart);
        downloadedBytes += value.length;
        progress.downloadedBytes = downloadedBytes;
        progress.progress =
          totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
        this.notifyProgress(songId, progress);
      }

      const blob = new Blob(chunks, { type: "audio/mpeg" });
      const fileSize = blob.size;

      await webDB.saveBlob(songId, blob);

      const blobUrl = URL.createObjectURL(blob);

      const downloadedTrack: DownloadedTrack = {
        id: songId,
        song: track,
        filePath: blobUrl,
        downloadedAt: Date.now(),
        fileSize,
        quality: qualityKey,
      };

      const downloads = await this.getDownloadedTracks();
      downloads.unshift(downloadedTrack);
      await this.saveDownloadedTracks(downloads);

      progress.status = "completed";
      progress.progress = 100;
      this.notifyProgress(songId, progress);
      return downloadedTrack;
    } catch (error) {
      console.error("[DownloadService] Download failed:", error);
      progress.status = "failed";
      progress.error =
        error instanceof Error ? error.message : "Download failed";
      this.notifyProgress(songId, progress);
      throw error;
    } finally {
      setTimeout(() => {
        this.downloadQueue.delete(songId);
        this.progressCallbacks.delete(songId);
      }, 1000);
    }
  }

  async deleteDownload(songId: string): Promise<void> {
    const downloads = await this.getDownloadedTracks();
    const download = downloads.find((d) => d.id === songId);
    if (!download) throw new Error("Download not found");

    try {
      if (download.filePath.startsWith("blob:")) {
        URL.revokeObjectURL(download.filePath);
      }

      await webDB.deleteBlob(songId);

      const updated = downloads.filter((d) => d.id !== songId);
      await this.saveDownloadedTracks(updated);
    } catch (error) {
      console.error("[DownloadService] Delete failed:", error);
      throw error;
    }
  }

  async deleteAllDownloads(): Promise<void> {
    const downloads = await this.getDownloadedTracks();
    try {
      for (const download of downloads) {
        if (download.filePath.startsWith("blob:")) {
          URL.revokeObjectURL(download.filePath);
        }
      }

      await webDB.clear();
      await this.saveDownloadedTracks([]);
    } catch (error) {
      console.error("[DownloadService] Delete all failed:", error);
      throw error;
    }
  }

  async getTotalSize(): Promise<number> {
    const downloads = await this.getDownloadedTracks();
    return downloads.reduce((total, download) => total + download.fileSize, 0);
  }

  getProgress(songId: string): DownloadProgress | null {
    return this.downloadQueue.get(songId) || null;
  }

  private notifyProgress(songId: string, progress: DownloadProgress): void {
    const callback = this.progressCallbacks.get(songId);
    if (callback) callback({ ...progress });
  }

  async cleanupOrphans(): Promise<void> {
    try {
      const downloads = await this.getDownloadedTracks();
      const validIds = new Set(downloads.map((d) => d.id));

      const allKeys = await webDB.getAllKeys();
      for (const key of allKeys) {
        if (!validIds.has(key)) {
          await webDB.deleteBlob(key);
        }
      }

      for (const download of downloads) {
        const blob = await webDB.getBlob(download.id);
        if (!blob && download.filePath.startsWith("blob:")) {
          const updated = downloads.filter((d) => d.id !== download.id);
          await this.saveDownloadedTracks(updated);
        }
      }
    } catch (error) {
      console.error("[DownloadService] Cleanup failed:", error);
    }
  }

  async getStats(): Promise<{
    totalDownloads: number;
    totalSize: number;
    averageSize: number;
    byQuality: Record<string, number>;
  }> {
    const downloads = await this.getDownloadedTracks();
    const totalSize = downloads.reduce((sum, d) => sum + d.fileSize, 0);

    const byQuality: Record<string, number> = {};
    downloads.forEach((d) => {
      byQuality[d.quality] = (byQuality[d.quality] || 0) + 1;
    });

    return {
      totalDownloads: downloads.length,
      totalSize,
      averageSize: downloads.length > 0 ? totalSize / downloads.length : 0,
      byQuality,
    };
  }

  async getPlaybackUrl(songId: string): Promise<string | null> {
    const blob = await webDB.getBlob(songId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  async exportTracks(songIds: string[]): Promise<void> {
    const downloads = await this.getDownloadedTracks();

    for (const songId of songIds) {
      const download = downloads.find((d) => d.id === songId);
      if (!download) continue;

      try {
        const blob = await webDB.getBlob(songId);
        if (!blob) continue;

        const artist =
          download.song.artists?.primary?.[0]?.name || "Unknown Artist";
        const title = download.song.title || "Unknown";
        const extension =
          blob.type.includes("mp4") || blob.type.includes("m4a")
            ? "m4a"
            : blob.type.includes("aac")
              ? "aac"
              : "mp3";

        const safeArtist = artist.replace(/[^a-z0-9._-]/gi, "_").slice(0, 50);
        const safeTitle = title.replace(/[^a-z0-9._-]/gi, "_").slice(0, 50);
        const filename = `${safeTitle} - ${safeArtist}.${extension}`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (songIds.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`[DownloadService] Failed to export ${songId}:`, error);
        throw error;
      }
    }
  }
}

export const downloadService = new DownloadService();
