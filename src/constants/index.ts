/**
 * Application Constants
 * Centralized configuration for maintainability
 */

export const STORAGE_KEYS = {
  FAVORITES: "@favorites",
  COLLECTIONS: "@collections",
  HISTORY: "@playback_history",
  RECENT_SEARCHES: "@recent_searches",
  USER_PREFERENCES: "@user_preferences",
  PLAYER_STATE: "@player_state",
  CONTENT_QUALITY: "CONTENT_QUALITY",
} as const;

export const PLAYER_CONFIG = {
  PROGRESS_UPDATE_INTERVAL: 500,
  PLAY_NEXT_DEBOUNCE: 500,
  METADATA_UPDATE_THROTTLE: 1000,
  TRACK_END_THRESHOLD: 0.3,
  MAX_HISTORY_ENTRIES: 500,
  RECENT_SONG_THRESHOLD: 5 * 60 * 1000,
} as const;

export const QUEUE_CONFIG = {
  MAX_PREVIOUS: 10,
  MIN_AFTER: 1,
  MAX_AFTER: 9,
} as const;

export const UI_CONFIG = {
  SEARCH_DEBOUNCE: 300,
  MAX_RECENT_SEARCHES: 10,
  DEFAULT_PAGE_SIZE: 20,
  SKELETON_ITEMS: 5,
} as const;

export const AUDIO_QUALITY = {
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
} as const;

export type AudioQualityType = keyof typeof AUDIO_QUALITY;

export const COLORS = {
  PRIMARY: "#1DB954",
  SECONDARY: "#1ed760",
  BACKGROUND: "#121212",
  SURFACE: "#282828",
  SURFACE_VARIANT: "#333333",
  ON_SURFACE: "#ffffff",
  ON_SURFACE_VARIANT: "#b3b3b3",
  ERROR: "#cf6679",
  ON_ERROR: "#000000",
  OUTLINE: "#404040",
  DEFAULT_FALLBACK: "#163f24",
} as const;
