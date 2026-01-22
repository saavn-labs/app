import { GenericMediaItem, TrackItem } from "@/components";
import { UI_CONFIG } from "@/constants";
import { usePlayer } from "@/contexts/PlayerContext";
import { storageService } from "@/services/StorageService";
import { getScreenPaddingBottom } from "@/utils/designSystem";
import { handleAsync, logError } from "@/utils/errorHandler";
import { Album, Artist, Extras, Models, Playlist, Song } from "@saavn-labs/sdk";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Searchbar, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SearchTab = "all" | "songs" | "albums" | "artists" | "playlists";

interface SearchScreenProps {
  onAlbumPress: (albumId: string) => void;
  onArtistPress: (artistId: string) => void;
  onPlaylistPress: (playlistId: string) => void;
  onBack?: () => void;
}

interface SearchResults {
  songs: Models.Song[];
  albums: Models.Album[];
  artists: Models.Artist[];
  playlists: Models.Playlist[];
}

interface LoadingStates {
  songs: boolean;
  albums: boolean;
  artists: boolean;
  playlists: boolean;
}

const SkeletonItem: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.skeletonItem}>
      <Animated.View style={[styles.skeletonImage, { opacity: fadeAnim }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonTitle, { opacity: fadeAnim }]} />
        <Animated.View
          style={[styles.skeletonSubtitle, { opacity: fadeAnim }]}
        />
      </View>
    </View>
  );
};

const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.section}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonItem key={index} />
    ))}
  </View>
);

const RecentSearches: React.FC<{
  searches: string[];
  onSelect: (search: string) => void;
  onRemove: (search: string) => void;
  onClearAll: () => void;
}> = ({ searches, onSelect, onRemove, onClearAll }) => {
  const theme = useTheme();

  if (searches.length === 0) return null;

  return (
    <View style={styles.recentSection}>
      <View style={styles.recentHeader}>
        <Text variant="titleLarge" style={styles.recentTitle}>
          Recent searches
        </Text>
        <TouchableOpacity onPress={onClearAll} activeOpacity={0.7}>
          <Text style={[styles.clearText, { color: theme.colors.primary }]}>
            Clear all
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.recentList}>
        {searches.map((search, index) => (
          <TouchableOpacity
            key={`${search}-${index}`}
            onPress={() => onSelect(search)}
            style={styles.recentItem}
            activeOpacity={0.7}
          >
            <View style={styles.recentItemLeft}>
              <IconButton
                icon="clock-outline"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                style={styles.recentIcon}
              />
              <Text variant="bodyLarge" style={styles.recentSearchText}>
                {search}
              </Text>
            </View>
            <IconButton
              icon="close"
              size={18}
              iconColor={theme.colors.onSurfaceVariant}
              onPress={(e) => {
                e.stopPropagation();
                onRemove(search);
              }}
              style={styles.removeIcon}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const EmptySearchState: React.FC<{ query: string }> = ({ query }) => {
  const theme = useTheme();

  return (
    <View style={styles.emptyState}>
      <IconButton
        icon="magnify"
        size={64}
        iconColor={theme.colors.onSurfaceVariant}
        style={styles.emptyIcon}
      />
      <Text variant="titleLarge" style={styles.emptyTitle}>
        No results found
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Try searching with different keywords
      </Text>
    </View>
  );
};

const SearchScreen: React.FC<SearchScreenProps> = ({
  onAlbumPress,
  onArtistPress,
  onPlaylistPress,
  onBack,
}) => {
  const theme = useTheme();
  const { playSong, currentSong } = usePlayer();
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [results, setResults] = useState<SearchResults>({
    songs: [],
    albums: [],
    artists: [],
    playlists: [],
  });
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    songs: false,
    albums: false,
    artists: false,
    playlists: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    const searches = await storageService.getRecentSearches();
    setRecentSearches(searches);
  };

  const searchCategory = async (
    query: string,
    category: keyof SearchResults,
    signal: AbortSignal,
  ) => {
    try {
      setLoadingStates((prev) => ({ ...prev, [category]: true }));

      let result;
      const limit = 50;

      switch (category) {
        case "songs":
          result = await Song.search({ query, limit });
          break;
        case "albums":
          result = await Album.search({ query, limit });
          break;
        case "artists":
          result = await Artist.search({ query, limit });
          break;
        case "playlists":
          result = await Playlist.search({ query, limit });
          break;
      }

      if (!signal.aborted) {
        setResults((prev) => ({ ...prev, [category]: result.results }));
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error(`Error searching ${category}:`, err);
      }
    } finally {
      if (!signal.aborted) {
        setLoadingStates((prev) => ({ ...prev, [category]: false }));
      }
    }
  };

  const performSearch = useCallback(async (query: string, tab: SearchTab) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Save to recent searches
    if (trimmedQuery) {
      const result = await handleAsync(
        async () => await storageService.addRecentSearch(trimmedQuery),
        "Failed to save recent search",
      );
      if (result.success) {
        await loadRecentSearches();
      }
    }

    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setError(null);
      setResults({ songs: [], albums: [], artists: [], playlists: [] });

      if (tab === "all") {
        setLoadingStates({
          songs: true,
          albums: true,
          artists: true,
          playlists: true,
        });

        const searchResult = await handleAsync(
          async () => await Extras.searchAll({ query: trimmedQuery }),
          "Search failed",
        );

        if (searchResult.success && searchResult.data) {
          const result = searchResult.data;
          if (!abortController.signal.aborted) {
            setResults({
              songs: (result.songs?.data as Models.Song[]) || [],
              albums: (result.albums?.data as Models.Album[]) || [],
              artists: (result.artists?.data as Models.Artist[]) || [],
              playlists: (result.playlists?.data as Models.Playlist[]) || [],
            });
          }
        } else if (!abortController.signal.aborted) {
          setError(searchResult.error || "Search failed");
          logError("SearchScreen.performSearch", searchResult.error);
        }

        if (!abortController.signal.aborted) {
          setLoadingStates({
            songs: false,
            albums: false,
            artists: false,
            playlists: false,
          });
        }
      } else {
        await searchCategory(
          trimmedQuery,
          tab as keyof SearchResults,
          abortController.signal,
        );
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        logError("SearchScreen.performSearch", err);
        setError("Failed to perform search. Please try again.");
      }
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(trimmedQuery, activeTab);
      }, UI_CONFIG.SEARCH_DEBOUNCE);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults({ songs: [], albums: [], artists: [], playlists: [] });
      setLoadingStates({
        songs: false,
        albums: false,
        artists: false,
        playlists: false,
      });
      setError(null);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, activeTab, performSearch]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      performSearch(trimmedQuery, activeTab);
    }
  }, [activeTab]);

  const handleTrackPress = useCallback(
    (track: Models.Song) => {
      playSong(track);
    },
    [results.songs, playSong],
  );

  const handleRemoveRecentSearch = useCallback(async (search: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== search));
  }, []);

  const handleClearRecentSearches = useCallback(async () => {
    await storageService.clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleRecentSearchSelect = useCallback((search: string) => {
    setSearchQuery(search);
  }, []);

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeaderContainer}>
      <Text variant="titleLarge" style={styles.sectionHeaderText}>
        {title}
      </Text>
      {count > 5 && (
        <Text
          variant="bodySmall"
          style={[
            styles.sectionCount,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {count} results
        </Text>
      )}
    </View>
  );

  const renderSongsList = (songs: Models.Song[], isLoading: boolean) => {
    if (isLoading) return <SkeletonList count={3} />;
    if (songs.length === 0) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader("Songs", songs.length)}
        {songs
          .slice(0, activeTab === "songs" ? songs.length : 5)
          .map((song) => (
            <TrackItem
              key={song.id}
              track={song}
              onPress={() => handleTrackPress(song)}
              isActive={currentSong?.id === song.id}
              showArtwork
            />
          ))}
      </View>
    );
  };

  const renderAlbumsList = (albums: Models.Album[], isLoading: boolean) => {
    if (isLoading) return <SkeletonList count={3} />;
    if (albums.length === 0) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader("Albums", albums.length)}
        {albums
          .slice(0, activeTab === "albums" ? albums.length : 5)
          .map((album) => (
            <GenericMediaItem
              key={album.id}
              data={album}
              type="album"
              onPress={() => onAlbumPress(album.id)}
            />
          ))}
      </View>
    );
  };

  const renderArtistsList = (artists: Models.Artist[], isLoading: boolean) => {
    if (isLoading) return <SkeletonList count={3} />;
    if (artists.length === 0) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader("Artists", artists.length)}
        {artists
          .slice(0, activeTab === "artists" ? artists.length : 5)
          .map((artist) => (
            <GenericMediaItem
              key={artist.id}
              data={artist}
              type="artist"
              onPress={() => onArtistPress(artist.id)}
            />
          ))}
      </View>
    );
  };

  const renderPlaylistsList = (
    playlists: Models.Playlist[],
    isLoading: boolean,
  ) => {
    if (isLoading) return <SkeletonList count={3} />;
    if (playlists.length === 0) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader("Playlists", playlists.length)}
        {playlists
          .slice(0, activeTab === "playlists" ? playlists.length : 5)
          .map((playlist) => (
            <GenericMediaItem
              key={playlist.id}
              data={playlist}
              type="playlist"
              onPress={() => onPlaylistPress(playlist.id)}
            />
          ))}
      </View>
    );
  };

  const renderAllTab = () => {
    const hasAnyResults =
      results.songs.length > 0 ||
      results.albums.length > 0 ||
      results.artists.length > 0 ||
      results.playlists.length > 0;

    const isAnyLoading =
      loadingStates.songs ||
      loadingStates.albums ||
      loadingStates.artists ||
      loadingStates.playlists;

    if (!searchQuery.trim()) {
      return (
        <RecentSearches
          searches={recentSearches}
          onSelect={handleRecentSearchSelect}
          onRemove={handleRemoveRecentSearch}
          onClearAll={handleClearRecentSearches}
        />
      );
    }

    if (!hasAnyResults && !isAnyLoading) {
      return <EmptySearchState query={searchQuery} />;
    }

    return (
      <>
        {renderSongsList(results.songs, loadingStates.songs)}
        {renderAlbumsList(results.albums, loadingStates.albums)}
        {renderArtistsList(results.artists, loadingStates.artists)}
        {renderPlaylistsList(results.playlists, loadingStates.playlists)}
      </>
    );
  };

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <IconButton
            icon="alert-circle-outline"
            size={64}
            iconColor="#ef4444"
            style={styles.errorIcon}
          />
          <Text variant="titleMedium" style={styles.errorText}>
            {error}
          </Text>
        </View>
      );
    }

    switch (activeTab) {
      case "songs":
        return renderSongsList(results.songs, loadingStates.songs);
      case "albums":
        return renderAlbumsList(results.albums, loadingStates.albums);
      case "artists":
        return renderArtistsList(results.artists, loadingStates.artists);
      case "playlists":
        return renderPlaylistsList(results.playlists, loadingStates.playlists);
      default:
        return renderAllTab();
    }
  };

  const tabs = [
    { id: "all" as SearchTab, label: "All" },
    { id: "songs" as SearchTab, label: "Songs" },
    { id: "albums" as SearchTab, label: "Albums" },
    { id: "artists" as SearchTab, label: "Artists" },
    { id: "playlists" as SearchTab, label: "Playlists" },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Search Header */}
      <View style={[styles.header]}>
        {onBack && (
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={onBack}
            style={styles.backButton}
          />
        )}
        <Searchbar
          placeholder="Artists, songs, or albums"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[
            styles.searchbar,
            onBack && styles.searchbarWithBack,
            {
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
          inputStyle={styles.searchbarInput}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          elevation={0}
        />
      </View>

      {/* Filter Tabs */}
      {searchQuery.trim().length >= 2 && (
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  activeTab === tab.id && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  variant="labelLarge"
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        activeTab === tab.id
                          ? "#000000"
                          : theme.colors.onSurface,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {renderContent()}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: {
    margin: 0,
  },
  searchbar: {
    flex: 1,
    borderRadius: 8,
    elevation: 0,
  },
  searchbarInput: {
    fontSize: 15,
    minHeight: 0,
    paddingVertical: 0,
  },
  searchbarWithBack: {
    flex: 1,
  },

  tabsWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabsContent: {
    gap: 8,
    paddingRight: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tabLabel: {
    fontWeight: "600",
    letterSpacing: 0.25,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  recentSection: {
    paddingTop: 8,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  recentTitle: {
    fontWeight: "700",
  },
  clearText: {
    fontWeight: "600",
    fontSize: 14,
  },
  recentList: {
    paddingHorizontal: 8,
  },
  recentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  recentItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recentIcon: {
    margin: 0,
    marginRight: 4,
  },
  recentSearchText: {
    flex: 1,
  },
  removeIcon: {
    margin: 0,
  },

  section: {
    marginBottom: 32,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontWeight: "700",
    fontSize: 22,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "500",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    margin: 0,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyTitle: {
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    opacity: 0.7,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  errorIcon: {
    margin: 0,
    marginBottom: 16,
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    fontWeight: "600",
  },

  skeletonItem: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  skeletonImage: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 8,
    width: "70%",
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    width: "50%",
  },
});

export default SearchScreen;
