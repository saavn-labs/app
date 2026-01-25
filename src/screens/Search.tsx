import { GenericMediaItem, TrackItem } from "@/components";
import { UI_CONFIG } from "@/constants";
import { useCurrentSong, usePlayerActions } from "@/stores/playerStore";
import { useSearchStore } from "@/stores/searchStore";
import { getScreenPaddingBottom } from "@/utils/designSystem";
import { Models } from "@saavn-labs/sdk";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Searchbar, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VoiceSearchModal from "../components/search/VoiceSearchModal";

type SearchTab = "songs" | "albums" | "artists" | "playlists";

interface SearchScreenProps {
  onAlbumPress: (albumId: string) => void;
  onArtistPress: (artistId: string) => void;
  onPlaylistPress: (playlistId: string) => void;
  onBack?: () => void;
}

const MIN_SEARCH_LENGTH = 2;
const MAX_RECENT_SEARCHES_DISPLAY = 5;

const SkeletonItem = React.memo(() => {
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
});

const SkeletonList = React.memo(
  ({ count = UI_CONFIG.SKELETON_ITEMS }: { count?: number }) => (
    <View style={styles.section}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </View>
  ),
);

const RecentSearchItem = React.memo(
  ({
    search,
    onPress,
    onRemove,
  }: {
    search: string;
    onPress: () => void;
    onRemove: () => void;
  }) => {
    const theme = useTheme();

    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.recentItem}
        activeOpacity={0.7}
      >
        <IconButton
          icon="clock-outline"
          size={20}
          iconColor={theme.colors.onSurfaceVariant}
          style={styles.recentIcon}
        />
        <Text
          variant="bodyLarge"
          style={styles.recentSearchText}
          numberOfLines={1}
        >
          {search}
        </Text>
        <IconButton
          icon="close"
          size={18}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={(e) => {
            e?.stopPropagation?.();
            onRemove();
          }}
          style={styles.removeIcon}
        />
      </TouchableOpacity>
    );
  },
);

const RecentSearches = React.memo(
  ({
    searches,
    onSelect,
    onRemove,
    onClearAll,
    maxDisplay = MAX_RECENT_SEARCHES_DISPLAY,
  }: {
    searches: string[];
    onSelect: (search: string) => void;
    onRemove: (search: string) => void;
    onClearAll: () => void;
    maxDisplay?: number;
  }) => {
    const theme = useTheme();

    if (searches.length === 0) return null;

    const displaySearches = searches.slice(0, maxDisplay);

    return (
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text variant="titleMedium" style={styles.recentTitle}>
            Recent searches
          </Text>
          <TouchableOpacity onPress={onClearAll} activeOpacity={0.7}>
            <Text style={[styles.clearText, { color: theme.colors.primary }]}>
              Clear all
            </Text>
          </TouchableOpacity>
        </View>
        {displaySearches.map((item, index) => (
          <RecentSearchItem
            key={`recent-${index}`}
            search={item}
            onPress={() => onSelect(item)}
            onRemove={() => onRemove(item)}
          />
        ))}
      </View>
    );
  },
);

const EmptySearchState = React.memo(({ query }: { query: string }) => {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[styles.emptyState, { transform: [{ scale: scaleAnim }] }]}
    >
      <IconButton
        icon="magnify"
        size={64}
        iconColor={theme.colors.onSurfaceVariant}
        style={styles.emptyIcon}
      />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No results for "{query}"
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Try searching with different keywords
      </Text>
    </Animated.View>
  );
});

const SearchScreen: React.FC<SearchScreenProps> = ({
  onAlbumPress,
  onArtistPress,
  onPlaylistPress,
  onBack,
}) => {
  const theme = useTheme();

  const { playSong } = usePlayerActions();
  const currentSong = useCurrentSong();

  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;

  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    results,
    loadingStates,
    error,
    recentSearches,
    loadRecentSearches,
    removeRecentSearch,
    clearRecentSearches,
    executeSearch,
    clearSearchResults,
    cancelSearch,
  } = useSearchStore();

  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousActiveTabRef = useRef<SearchTab | null>(activeTab);

  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      cancelSearch();
    };
  }, [cancelSearch]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    const hasQuery = trimmedQuery.length >= MIN_SEARCH_LENGTH;

    if (!hasQuery || !activeTab) return;

    const isCurrentTabLoading = loadingStates[activeTab];
    if (isCurrentTabLoading) return;

    const currentTabResults = results[activeTab] || [];
    const hasCurrentTabResults = currentTabResults.length > 0;

    if (!hasCurrentTabResults && activeTab !== "songs") {
      const hasSongsResults = (results.songs || []).length > 0;
      const isSongsLoading = loadingStates.songs;

      if (hasSongsResults || !isSongsLoading) {
        previousActiveTabRef.current = activeTab;
        setActiveTab("songs");
      }
    }
  }, [activeTab, results, loadingStates, searchQuery, setActiveTab]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length >= MIN_SEARCH_LENGTH) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(trimmedQuery, activeTab);
      }, UI_CONFIG.SEARCH_DEBOUNCE);
    } else {
      cancelSearch();
      clearSearchResults();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, activeTab, executeSearch, clearSearchResults, cancelSearch]);

  const handleVoiceResult = useCallback(
    (text: string) => {
      setSearchQuery(text);
      executeSearch(text, null);
      setIsVoiceModalVisible(false);
    },
    [executeSearch, setSearchQuery],
  );

  const handleTrackPress = useCallback(
    (track: Models.Song) => {
      playSong(track);
    },
    [playSong],
  );

  const handleClearRecentSearches = useCallback(async () => {
    await clearRecentSearches();
  }, [clearRecentSearches]);

  const handleRecentSearchSelect = useCallback(
    (search: string) => {
      setSearchQuery(search);
    },
    [setSearchQuery],
  );

  const handleRemoveRecentSearch = useCallback(
    async (search: string) => {
      await removeRecentSearch(search);
    },
    [removeRecentSearch],
  );

  const renderSectionHeader = useCallback(
    (title: string, count: number) => (
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
    ),
    [theme],
  );

  const renderSongsList = useCallback(
    (songs: Models.Song[], isLoading: boolean) => {
      if (isLoading) return <SkeletonList count={3} />;
      if (songs.length === 0) return null;

      const displaySongs = activeTab === "songs" ? songs : songs.slice(0, 5);

      return (
        <View style={styles.section}>
          {renderSectionHeader("Songs", songs.length)}
          {displaySongs.map((item) => (
            <TrackItem
              key={item.id}
              track={item}
              onPress={() => handleTrackPress(item)}
              isActive={currentSong?.id === item.id}
              showArtwork
            />
          ))}
        </View>
      );
    },
    [activeTab, currentSong, handleTrackPress, renderSectionHeader],
  );

  const renderAlbumsList = useCallback(
    (albums: Models.Album[], isLoading: boolean) => {
      if (isLoading) return <SkeletonList count={3} />;
      if (albums.length === 0) return null;

      const displayAlbums =
        activeTab === "albums" ? albums : albums.slice(0, 5);

      return (
        <View style={styles.section}>
          {renderSectionHeader("Albums", albums.length)}
          {displayAlbums.map((item) => (
            <GenericMediaItem
              key={item.id}
              data={item}
              type="album"
              onPress={() => onAlbumPress(item.id)}
            />
          ))}
        </View>
      );
    },
    [activeTab, onAlbumPress, renderSectionHeader],
  );

  const renderArtistsList = useCallback(
    (artists: Models.Artist[], isLoading: boolean) => {
      if (isLoading) return <SkeletonList count={3} />;
      if (artists.length === 0) return null;

      const displayArtists =
        activeTab === "artists" ? artists : artists.slice(0, 5);

      return (
        <View style={styles.section}>
          {renderSectionHeader("Artists", artists.length)}
          {displayArtists.map((item) => (
            <GenericMediaItem
              key={item.id}
              data={item}
              type="artist"
              onPress={() => onArtistPress(item.id)}
            />
          ))}
        </View>
      );
    },
    [activeTab, onArtistPress, renderSectionHeader],
  );

  const renderPlaylistsList = useCallback(
    (playlists: Models.Playlist[], isLoading: boolean) => {
      if (isLoading) return <SkeletonList count={3} />;
      if (playlists.length === 0) return null;

      const displayPlaylists =
        activeTab === "playlists" ? playlists : playlists.slice(0, 5);

      return (
        <View style={styles.section}>
          {renderSectionHeader("Playlists", playlists.length)}
          {displayPlaylists.map((item) => (
            <GenericMediaItem
              key={item.id}
              data={item}
              type="playlist"
              onPress={() => onPlaylistPress(item.id)}
            />
          ))}
        </View>
      );
    },
    [activeTab, onPlaylistPress, renderSectionHeader],
  );

  const renderContent = () => {
    const hasQuery = searchQuery.trim().length >= MIN_SEARCH_LENGTH;
    const hasAnyResults =
      results.songs?.length > 0 ||
      results.albums?.length > 0 ||
      results.artists?.length > 0 ||
      results.playlists?.length > 0;

    if (!hasQuery && !hasAnyResults) {
      return (
        <RecentSearches
          searches={recentSearches}
          onSelect={handleRecentSearchSelect}
          onRemove={handleRemoveRecentSearch}
          onClearAll={handleClearRecentSearches}
        />
      );
    }

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

    const isAnyLoading = Object.values(loadingStates).some(
      (loading) => loading,
    );

    if (!hasAnyResults && !isAnyLoading && hasQuery) {
      return <EmptySearchState query={searchQuery} />;
    }

    if (activeTab) {
      switch (activeTab) {
        case "songs":
          return renderSongsList(results.songs || [], loadingStates.songs);
        case "albums":
          return renderAlbumsList(results.albums || [], loadingStates.albums);
        case "artists":
          return renderArtistsList(
            results.artists || [],
            loadingStates.artists,
          );
        case "playlists":
          return renderPlaylistsList(
            results.playlists || [],
            loadingStates.playlists,
          );
      }
    }

    return (
      <>
        {renderSongsList(results.songs || [], loadingStates.songs)}
        {renderAlbumsList(results.albums || [], loadingStates.albums)}
        {renderArtistsList(results.artists || [], loadingStates.artists)}
        {renderPlaylistsList(results.playlists || [], loadingStates.playlists)}
      </>
    );
  };

  const tabs = useMemo(
    () => [
      { id: "songs" as SearchTab, label: "Songs" },
      { id: "albums" as SearchTab, label: "Albums" },
      { id: "artists" as SearchTab, label: "Artists" },
      { id: "playlists" as SearchTab, label: "Playlists" },
    ],
    [],
  );

  const shouldShowTabs = searchQuery.trim().length >= MIN_SEARCH_LENGTH;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
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
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          inputStyle={styles.searchbarInput}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          elevation={0}
          right={() =>
            searchQuery ? (
              <IconButton
                icon="close"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => setSearchQuery("")}
              />
            ) : (
              <IconButton
                icon="microphone"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => setIsVoiceModalVisible(true)}
              />
            )
          }
        />
      </View>

      {shouldShowTabs && (
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {tabs.map((tab) => {
              const tabResults = results[tab.id] || [];
              const hasTabResults = tabResults.length > 0;
              const isTabLoading = loadingStates[tab.id];
              const isTabActive = activeTab === tab.id;

              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(isTabActive ? null : tab.id)}
                  style={[
                    styles.tab,
                    isTabActive && {
                      backgroundColor: theme.colors.primary,
                    },
                    !hasTabResults &&
                      !isTabLoading &&
                      !isTabActive &&
                      styles.tabDisabled,
                  ]}
                  activeOpacity={0.7}
                  disabled={!hasTabResults && !isTabLoading && !isTabActive}
                >
                  <Text
                    variant="labelLarge"
                    style={[
                      styles.tabLabel,
                      {
                        color: isTabActive ? "#000000" : theme.colors.onSurface,
                      },
                      !hasTabResults &&
                        !isTabLoading &&
                        !isTabActive &&
                        styles.tabLabelDisabled,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderContent()}
      </ScrollView>

      <VoiceSearchModal
        visible={isVoiceModalVisible}
        onClose={() => setIsVoiceModalVisible(false)}
        onResult={handleVoiceResult}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: { margin: 0 },
  searchbar: { flex: 1, borderRadius: 8, elevation: 0 },
  searchbarInput: { fontSize: 15, minHeight: 0, paddingVertical: 0 },
  searchbarWithBack: { flex: 1 },
  tabsWrapper: { paddingHorizontal: 16, paddingBottom: 16 },
  tabsContent: { gap: 8, paddingRight: 16 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tabDisabled: {
    opacity: 0.4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  tabLabel: { fontWeight: "600", letterSpacing: 0.25 },
  tabLabelDisabled: {
    opacity: 0.5,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  recentSection: { paddingTop: 8 },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  recentTitle: { fontWeight: "700" },
  clearText: { fontWeight: "600", fontSize: 14 },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 8,
  },
  recentIcon: { margin: 0, marginRight: 8 },
  recentSearchText: { flex: 1 },
  removeIcon: { margin: 0, marginLeft: 4 },
  section: { marginBottom: 32 },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderText: { fontWeight: "700", fontSize: 20 },
  sectionCount: { fontSize: 12, fontWeight: "500" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyIcon: { margin: 0, marginBottom: 16, opacity: 0.3 },
  emptyTitle: { fontWeight: "600", marginBottom: 8, textAlign: "center" },
  emptySubtitle: { textAlign: "center", opacity: 0.7 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  errorIcon: { margin: 0, marginBottom: 16 },
  errorText: { color: "#ef4444", textAlign: "center", fontWeight: "600" },
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
  skeletonContent: { flex: 1, marginLeft: 12 },
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
