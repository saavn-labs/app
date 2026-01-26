import { Models } from "@saavn-labs/sdk";

export type MediaType = "song" | "album" | "artist" | "playlist" | "collection";
export type PlayerStatus = "playing" | "paused" | "loading";
export type RepeatMode = "off" | "one" | "all";
export type SearchCategory = "songs" | "albums" | "artists" | "playlists";
export type SearchTab = SearchCategory | null;

export type Language =
  | "hindi"
  | "english"
  | "punjabi"
  | "tamil"
  | "telugu"
  | "kannada"
  | "bengali"
  | "marathi";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface NavigationProps {
  onAlbumPress?: (albumId: string) => void;
  onArtistPress?: (artistId: string) => void;
  onPlaylistPress?: (playlistId: string) => void;
  onTrackPress?: (track: Models.Song) => void;
  onCollectionPress?: (collectionId: string) => void;
}

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

export interface Collection {
  id: string;
  name: string;
  description?: string;
  songs: Models.Song[];
  createdAt: string;
  updatedAt: string;
  coverUrl?: string;
}

export interface HistoryEntry {
  song: Models.Song;
  playedAt: string;
  duration: number;
}

export interface SearchResults {
  songs: Models.Song[];
  albums: Models.Album[];
  artists: Models.Artist[];
  playlists: Models.Playlist[];
}

export interface UserPreferences {
  defaultLanguage: Language;
  audioQuality: "low" | "medium" | "high";
  downloadQuality: "low" | "medium" | "high";
  enableCrossfade: boolean;
  crossfadeDuration: number;
  gaplessPlayback: boolean;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title?: string;
  name?: string;
  subtitle?: string;
  images?: Array<{ url: string; quality?: string }>;
  songs?: Models.Song[];
}

export interface LoadingStates {
  songs: boolean;
  albums: boolean;
  artists: boolean;
  playlists: boolean;
}
