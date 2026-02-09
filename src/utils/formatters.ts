import { Models } from "@saavn-labs/sdk";

/**
 * Format time into MM:SS format
 */
export function formatTime(
  time: number,
  isMilliseconds: boolean = true,
): string {
  const seconds = isMilliseconds ? Math.floor(time / 1000) : time;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get artist names as comma-separated string
 */
export function formatArtistNames(song: Models.Song): string {
  if (song.subtitle) return song.subtitle;

  if (song.artists?.primary) {
    const names = song.artists.primary.map((a) => a.name).join(", ");
    if (names) return names;
  }

  return "Unknown Artist";
}

/**
 * Build track subtitle with artists and album
 */
export function formatTrackSubtitle(song: Models.Song): string {
  if (song.subtitle) return song.subtitle;

  const parts: string[] = [];

  if (song.artists?.primary) {
    const artistNames = song.artists.primary.map((a) => a.name).join(", ");
    if (artistNames) parts.push(artistNames);
  }

  if (song.album?.title) {
    parts.push(song.album.title);
  }

  return parts.length > 0 ? parts.join(" • ") : "Unknown";
}

/**
 * Build share message for a song
 */
export function formatShareMessage(song: Models.Song): {
  message: string;
  title: string;
} {
  const url = `https://sausico.pages.dev/song/${song.id}`;
  const artistsText = formatArtistNames(song);
  const message = `Check out "${song.title}" by ${artistsText} on Sausico`;

  return {
    message: `${message}\n${url}`,
    title: song.title,
  };
}

/**
 * Format date for display (e.g., "Jan 24, 2026")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date and time for display (e.g., "Jan 24, 2026 at 3:45 PM")
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Check if array has items
 */
export function hasItems<T>(arr: T[] | undefined | null): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Check if array is empty
 */
export function isEmpty<T>(arr: T[] | undefined | null): boolean {
  return !arr || arr.length === 0;
}
