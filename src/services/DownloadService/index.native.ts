import { AUDIO_QUALITY, STORAGE_KEYS } from "@/constants";
import { appStorage } from "@/stores/storage";
import { Models, Song } from "@saavn-labs/sdk";
import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

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

export class DownloadService {
  private downloadQueue: Map<string, DownloadProgress> = new Map();
  private progressCallbacks: Map<string, (progress: DownloadProgress) => void> =
    new Map();

  private getDownloadsDirectory(): Directory {
    return new Directory(Paths.document, "Downloads");
  }

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
      const file = new File(download.filePath);
      return file.exists;
    } catch {
      return false;
    }
  }

  async getDownloadInfo(songId: string): Promise<DownloadedTrack | null> {
    const downloads = await this.getDownloadedTracks();
    return downloads.find((d) => d.id === songId) || null;
  }

  async downloadTrack(
    track: Models.Song,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<DownloadedTrack> {
    const songId = track.id;

    const existing = await this.getDownloadInfo(songId);
    if (existing) {
      const file = new File(existing.filePath);
      if (file.exists) {
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

      const extension = streamUrl.includes(".mp4")
        ? "m4a"
        : streamUrl.includes(".aac")
          ? "aac"
          : "mp3";

      const safeTitle = (track.title || "track")
        .replace(/[^a-z0-9._-]/gi, "_")
        .slice(0, 100);
      const filename = `${safeTitle}_${songId}.${extension}`;

      const downloadsDir = this.getDownloadsDirectory();

      if (!downloadsDir.exists) {
        downloadsDir.create({ intermediates: true });
      }

      const downloadedFile = await File.downloadFileAsync(
        streamUrl,
        new File(downloadsDir, filename),
        { idempotent: true },
      );

      const fileInfo = downloadedFile.info();
      const fileSize = fileInfo?.size || 0;

      const downloadedTrack: DownloadedTrack = {
        id: songId,
        song: track,
        filePath: downloadedFile.uri,
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
      const file = new File(download.filePath);
      if (file.exists) {
        file.delete();
      }
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
        try {
          const file = new File(download.filePath);
          if (file.exists) {
            file.delete();
          }
        } catch (error) {
          console.error(
            "[DownloadService] Failed to delete file:",
            download.filePath,
            error,
          );
        }
      }
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
      const downloadsDir = this.getDownloadsDirectory();
      if (!downloadsDir.exists) return;

      const downloads = await this.getDownloadedTracks();
      const validPaths = new Set(downloads.map((d) => d.filePath));

      const contents = downloadsDir.list();
      for (const item of contents) {
        if (item instanceof File && !validPaths.has(item.uri)) {
          try {
            item.delete();
          } catch (error) {
            console.error("[DownloadService] Failed to delete orphan:", error);
          }
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

  async saveToDownloads(fileUri: string): Promise<void> {
    const { status } = await MediaLibrary.getPermissionsAsync();

    if (status !== "granted") {
      const { status: newStatus } =
        await MediaLibrary.requestPermissionsAsync();

      if (newStatus !== "granted") {
        throw new Error("Permission to access media library is required");
      }
    }

    let album = await MediaLibrary.getAlbumAsync("Sausico Exports");

    if (!album) {
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("Sausico Exports", asset, false);
    } else {
      await MediaLibrary.createAssetAsync(fileUri, album);
    }
  }

  async exportTracks(songIds: string[]): Promise<void> {
    const downloads = await this.getDownloadedTracks();

    for (const songId of songIds) {
      const download = downloads.find((d) => d.id === songId);
      if (!download) continue;

      try {
        const sourceFile = new File(download.filePath);
        if (!sourceFile.exists) {
          console.warn(
            `[DownloadService] Source file not found: ${download.filePath}`,
          );
          continue;
        }

        const artist =
          download.song.artists?.primary?.[0]?.name || "Unknown Artist";
        const title = download.song.title || "Unknown";
        const extension = download.filePath.split(".").pop() || "mp3";

        const safeArtist = artist.replace(/[^a-z0-9._-]/gi, "_").slice(0, 50);
        const safeTitle = title.replace(/[^a-z0-9._-]/gi, "_").slice(0, 50);
        const filename = `${safeArtist} - ${safeTitle}.${extension}`;

        const fileUri = download.filePath;

        await this.saveToDownloads(fileUri);
      } catch (error) {
        console.error(`[DownloadService] Failed to export ${songId}:`, error);
        throw error;
      }
    }
  }
}

export const downloadService = new DownloadService();
