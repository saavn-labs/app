import { TrackItem } from "@/components";
import { HistoryEntry, HistorySection } from "@/services";
import { usePlayerStore, useHistoryStore, useSnackbarStore } from "@/stores";
import { theme, getScreenPaddingBottom } from "@/utils";

import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Alert,
  Animated,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Appbar, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<HistoryEntry, { title: string; data: HistoryEntry[] }>,
);

const INITIAL_ITEMS_PER_SECTION = 10;
const ITEMS_PER_PAGE = 20;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showSnackbar = useSnackbarStore((state) => state.show);
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;

  const { playSong, currentSong } = usePlayerStore();
  const {
    sections: fullSections,
    loading,
    loadHistory,
    removeHistoryEntry,
    clearHistory: clearHistoryStore,
  } = useHistoryStore();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [displayedItemsCount, setDisplayedItemsCount] = useState(
    INITIAL_ITEMS_PER_SECTION,
  );

  const sections = React.useMemo(() => {
    if (!fullSections || fullSections.length === 0) return [];

    let itemCount = 0;
    const result: HistorySection[] = [];

    for (const section of fullSections) {
      const remainingSlots = displayedItemsCount - itemCount;

      if (remainingSlots <= 0) break;

      const itemsToShow = Math.min(section.data.length, remainingSlots);

      result.push({
        ...section,
        data: section.data.slice(0, itemsToShow),
      });

      itemCount += itemsToShow;
    }

    return result;
  }, [fullSections, displayedItemsCount]);

  const totalFullTracks = fullSections.reduce(
    (sum, section) => sum + section.data.length,
    0,
  );

  const totalDisplayedTracks = sections.reduce(
    (sum, section) => sum + section.data.length,
    0,
  );

  const hasMoreItems = totalDisplayedTracks < totalFullTracks;

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePlaySong = async (entry: HistoryEntry) => {
    try {
      await playSong(entry.song);
    } catch (error) {
      showSnackbar({
        message: "Failed to play song",
        variant: "error",
      });
      console.error("[HistoryScreen] Play failed:", error);
    }
  };

  const handleRemoveFromHistory = async (songId: string) => {
    try {
      await removeHistoryEntry(songId);
      showSnackbar({
        message: "Removed from history",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "Failed to remove from history",
        variant: "error",
      });
      console.error("[HistoryScreen] Remove failed:", error);
    }
  };
  const clearHistory = async () => {
    try {
      await clearHistoryStore();
      setDisplayedItemsCount(INITIAL_ITEMS_PER_SECTION);
      showSnackbar({
        message: "History cleared",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "Failed to clear history",
        variant: "error",
      });
      console.error("[HistoryScreen] Clear failed:", error);
    }
  };

  const handleClearHistory = () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Clear History",
        `Remove all ${totalFullTracks} song${totalFullTracks !== 1 ? "s" : ""} from your listening history? This can't be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear All",
            style: "destructive",
            onPress: clearHistory,
          },
        ],
      );
    } else {
      window.confirm(
        `Remove all ${totalFullTracks} song${totalFullTracks !== 1 ? "s" : ""} from your listening history? This can't be undone.`,
      ) && clearHistory();
    }
  };

  const loadMoreItems = useCallback(() => {
    if (!hasMoreItems || loading) return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        setDisplayedItemsCount((prev) => prev + ITEMS_PER_PAGE);
      }, 100);
    });
  }, [hasMoreItems, loading]);

  const handleEndReached = useCallback(() => {
    loadMoreItems();
  }, [loadMoreItems]);

  const handleRefresh = useCallback(() => {
    setDisplayedItemsCount(INITIAL_ITEMS_PER_SECTION);
    loadHistory();
  }, [loadHistory]);

  const renderHistoryItem = useCallback(
    ({ item }: { item: HistoryEntry; index: number }) => {
      const playedDate = new Date(item.playedAt);
      const timeString = playedDate.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return (
        <View style={styles.historyItemContainer}>
          <View style={styles.trackItemWrapper}>
            <TrackItem
              track={item.song}
              onPress={() => handlePlaySong(item)}
              isActive={currentSong?.id === item.song.id}
            />
          </View>
          <View style={styles.historyItemActions}>
            <Text
              variant="bodySmall"
              style={[
                styles.playedTime,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {timeString}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFromHistory(item.song.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      currentSong?.id,
      theme.colors.onSurfaceVariant,
      handlePlaySong,
      handleRemoveFromHistory,
    ],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: HistorySection }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {section.title}
        </Text>
        <Text
          variant="bodySmall"
          style={[
            styles.sectionCount,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {section.data.length} song{section.data.length !== 1 ? "s" : ""}
        </Text>
      </View>
    ),
    [theme.colors.background, theme.colors.onSurfaceVariant],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.emptyIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialIcons name="history" size={64} color="#ffffff" />
      </LinearGradient>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No listening history
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
      >
        Songs you play will appear here
      </Text>
    </View>
  );

  const keyExtractor = useCallback(
    (item: HistoryEntry) => `${item.song.id}-${item.playedAt}`,
    [],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header elevated statusBarHeight={0}>
        <Appbar.BackAction onPress={() => router.push("/")} />
        <Appbar.Content title="History" />
        {totalFullTracks > 0 && (
          <Appbar.Action
            icon="delete-outline"
            onPress={handleClearHistory}
            iconColor={theme.colors.error}
          />
        )}
      </Appbar.Header>

      {totalFullTracks === 0 ? (
        renderEmptyState()
      ) : (
        <AnimatedSectionList
          sections={sections}
          renderItem={renderHistoryItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPadding },
          ]}
          stickySectionHeadersEnabled={true}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          style={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  initialLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 0,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  historyItemContainer: {
    position: "relative",
    paddingVertical: 4,
    gap: 4,
  },
  trackItemWrapper: {
    paddingRight: 80,
  },
  historyItemActions: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playedTime: {
    fontSize: 12,
    fontWeight: "500",
  },
  removeButton: {
    padding: 4,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  footerLoader: {
    marginVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyTitle: {
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
  },
});
