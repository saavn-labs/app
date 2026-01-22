import { Models } from "@saavn-labs/sdk";

// Media types
export type MediaType = "song" | "album" | "artist" | "playlist" | "collection";

// Player types
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type RepeatMode = boolean; // true = repeat on, false = repeat off

// Navigation types
export interface NavigationProps {
  onAlbumPress?: (albumId: string) => void;
  onArtistPress?: (artistId: string) => void;
  onPlaylistPress?: (playlistId: string) => void;
  onTrackPress?: (track: Models.Song) => void;
  onCollectionPress?: (collectionId: string) => void;
}

// Common component props
export interface BaseItemProps {
  onPress: () => void;
  horizontal?: boolean;
}

export interface TrackListProps {
  tracks: Models.Song[];
  onTrackPress: (track: Models.Song, index: number) => void;
  showArtwork?: boolean;
  showIndex?: boolean;
  activeTrackId?: string;
}

// Collection types
export interface Collection {
  id: string;
  name: string;
  description?: string;
  songs: Models.Song[];
  createdAt: string;
  updatedAt: string;
  coverUrl?: string;
}

// History types
export interface HistoryEntry {
  song: Models.Song;
  playedAt: string;
  duration?: number;
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  nextPage?: number;
}

// Search types
export type SearchCategory =
  | "all"
  | "songs"
  | "albums"
  | "artists"
  | "playlists";

export interface SearchResults {
  songs: Models.Song[];
  albums: Models.Album[];
  artists: Models.Artist[];
  playlists: Models.Playlist[];
}

// Language types
export type Language =
  | "hindi"
  | "english"
  | "punjabi"
  | "tamil"
  | "telugu"
  | "kannada"
  | "bengali"
  | "marathi";

// Storage keys
export enum StorageKeys {
  FAVORITES = "@favorites",
  COLLECTIONS = "@collections",
  HISTORY = "@history",
  RECENT_SEARCHES = "@recent_searches",
  USER_PREFERENCES = "@user_preferences",
}

// User preferences
export interface UserPreferences {
  defaultLanguage: Language;
  audioQuality: "low" | "medium" | "high";
  downloadQuality: "low" | "medium" | "high";
  enableCrossfade: boolean;
  crossfadeDuration: number;
  gaplessPlayback: boolean;
}

// Queue metadata
export interface QueueMetadata {
  source: "sequential" | "shuffled" | "radio";
  createdAt: string;
  originalQueue?: Models.Song[];
}

// Media item that can be any type of media
export interface MediaItem {
  id: string;
  type: MediaType;
  title?: string;
  name?: string;
  subtitle?: string;
  images?: Array<{ url: string; quality?: string }>;
  songs?: Models.Song[];
}
