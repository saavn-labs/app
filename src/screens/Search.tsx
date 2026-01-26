import { GenericMediaItem, TrackItem } from "@/components";
import { UI_CONFIG } from "@/constants";
import { useSearchStore } from "@/stores";
import { useCurrentSong, usePlayerActions } from "@/stores/playerStore";
import { theme, getScreenPaddingBottom } from "@/utils";
import VoiceSearchModal from "@/components/search/VoiceSearchModal";
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
import { IconButton, Searchbar, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SearchTab = "songs" | "albums" | "artists" | "playlists";

interface SearchScreenProps {
  onAlbumPress: (albumId: string) => void;
  onArtistPress: (artistId: string) => void;
  onPlaylistPress: (playlistId: string) => void;
  onBack?: () => void;
}

const MIN_SEARCH_LENGTH = 2;

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
    <Animated.View style={[styles.skeletonItem, { opacity: fadeAnim }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>
    </Animated.View>
  );
});

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
    return (
      <TouchableOpacity
        style={styles.recentItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <IconButton
          icon="history"
          size={20}
          style={styles.recentIcon}
          iconColor={theme.colors.onSurfaceVariant}
        />
        <Text style={styles.recentSearchText}>{search}</Text>
        <IconButton
          icon="close"
          size={18}
          style={styles.removeIcon}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={(e) => {
            e?.stopPropagation();
            onRemove();
          }}
        />
      </TouchableOpacity>
    );
  },
);

const EmptyState = React.memo(({ query }: { query: string }) => {
  return (
    <View style={styles.emptyState}>
      <IconButton
        icon="magnify"
        size={64}
        style={styles.emptyIcon}
        iconColor={theme.colors.onSurfaceVariant}
      />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No results for "{query}"
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Try searching with different keywords
      </Text>
    </View>
  );
});

const SearchScreen: React.FC<SearchScreenProps> = ({
  onAlbumPress,
  onArtistPress,
  onPlaylistPress,
  onBack,
}) => {
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

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      cancelSearch();
    };
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= MIN_SEARCH_LENGTH) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(trimmedQuery, activeTab);
      }, UI_CONFIG.SEARCH_DEBOUNCE);
    } else {
      cancelSearch();
      clearSearchResults();
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    const hasQuery = trimmedQuery.length >= MIN_SEARCH_LENGTH;
    const hasAnyResults =
      results.songs?.length ||
      results.albums?.length ||
      results.artists?.length ||
      results.playlists?.length;
    const isAnyLoading = Object.values(loadingStates).some(
      (loading) => loading,
    );

    if (hasQuery && !hasAnyResults && !isAnyLoading && activeTab === null) {
      setActiveTab("songs");
    }
  }, [searchQuery, results, loadingStates, activeTab, setActiveTab]);

  const handleTrackPress = useCallback(
    (track: Models.Song) => playSong(track),
    [playSong],
  );

  const handleRecentSearchSelect = useCallback(
    (search: string) => setSearchQuery(search),
    [setSearchQuery],
  );

  const handleTabPress = useCallback(
    (tabId: SearchTab) => setActiveTab(activeTab === tabId ? null : tabId),
    [activeTab, setActiveTab],
  );

  const handleVoiceResult = useCallback(
    (text: string) => {
      setSearchQuery(text);
      executeSearch(text, null);
      setIsVoiceModalVisible(false);
    },
    [executeSearch, setSearchQuery],
  );

  const renderSectionHeader = useCallback(
    (title: string, count: number) => (
      <View style={styles.sectionHeaderContainer}>
        <Text variant="headlineSmall" style={styles.sectionHeaderText}>
          {title}
        </Text>
        {count > 5 && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
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
      if (isLoading)
        return (
          <>
            {Array.from({ length: UI_CONFIG.SKELETON_ITEMS }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </>
        );
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
    [activeTab, currentSong?.id, handleTrackPress, renderSectionHeader],
  );

  const renderAlbumsList = useCallback(
    (albums: Models.Album[], isLoading: boolean) => {
      if (isLoading)
        return (
          <>
            {Array.from({ length: UI_CONFIG.SKELETON_ITEMS }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </>
        );
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
      if (isLoading)
        return (
          <>
            {Array.from({ length: UI_CONFIG.SKELETON_ITEMS }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </>
        );
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
      if (isLoading)
        return (
          <>
            {Array.from({ length: UI_CONFIG.SKELETON_ITEMS }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </>
        );
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
              onPress={() => onPlaylistPress(item.id)}
              type="playlist"
            />
          ))}
        </View>
      );
    },
    [activeTab, onPlaylistPress, renderSectionHeader],
  );

  const renderContent = useMemo(() => {
    const hasQuery = searchQuery.trim().length >= MIN_SEARCH_LENGTH;
    const hasAnyResults =
      results.songs?.length ||
      results.albums?.length ||
      results.artists?.length ||
      results.playlists?.length;

    if (!hasQuery && !hasAnyResults) {
      return recentSearches.length > 0 ? (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text variant="titleMedium" style={styles.recentTitle}>
              Recent searches
            </Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={[styles.clearText, { color: theme.colors.primary }]}>
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
          {recentSearches.slice(0, 5).map((item, index) => (
            <RecentSearchItem
              key={index}
              search={item}
              onPress={() => handleRecentSearchSelect(item)}
              onRemove={() => removeRecentSearch(item)}
            />
          ))}
        </View>
      ) : null;
    }

    const isAnyLoading = Object.values(loadingStates).some(
      (loading) => loading,
    );
    if (!hasAnyResults && !isAnyLoading && hasQuery) {
      return <EmptyState query={searchQuery} />;
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
  }, [searchQuery, results, loadingStates, recentSearches, activeTab, theme]);

  const tabs = [
    { id: "songs" as SearchTab, label: "Songs" },
    { id: "albums" as SearchTab, label: "Albums" },
    { id: "artists" as SearchTab, label: "Artists" },
    { id: "playlists" as SearchTab, label: "Playlists" },
  ];

  const shouldShowTabs = searchQuery.trim().length >= MIN_SEARCH_LENGTH;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[styles.header, { backgroundColor: theme.colors.background }]}
      >
        {onBack && (
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={onBack}
            style={styles.backButton}
          />
        )}
        <Searchbar
          placeholder="Search songs, albums, artists..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
          icon="magnify"
          clearIcon={searchQuery ? "close" : undefined}
          right={() => (
            <IconButton
              icon="microphone"
              size={20}
              onPress={() => setIsVoiceModalVisible(true)}
            />
          )}
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
              const isTabActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => handleTabPress(tab.id)}
                  style={[
                    styles.tab,
                    isTabActive && { backgroundColor: theme.colors.primary },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="labelLarge"
                    style={[
                      styles.tabLabel,
                      {
                        color: isTabActive
                          ? theme.colors.background
                          : theme.colors.onSurface,
                      },
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
      >
        {renderContent}
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
  tabLabel: { fontWeight: "600", letterSpacing: 0.25 },
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
