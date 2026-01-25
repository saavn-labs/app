import TrackItem from "@/components/items/TrackItem";
import { HistoryEntry, HistorySection } from "@/services";
import { useHistoryStore } from "@/stores/historyStore";
import { usePlayerStore } from "@/stores/playerStore";
import { getScreenPaddingBottom } from "@/utils/designSystem";
import { handleAsync } from "@/utils/errorHandler";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<HistoryEntry, { title: string; data: HistoryEntry[] }>,
);

export default function HistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;
  const { playSong, currentSong } = usePlayerStore();
  const {
    sections,
    loading,
    loadHistory,
    removeHistoryEntry,
    clearHistory: clearHistoryStore,
  } = useHistoryStore();

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePlaySong = async (entry: HistoryEntry) => {
    const result = await handleAsync(
      async () => await playSong(entry.song),
      "Failed to play song",
    );

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to play song");
      if (__DEV__) {
        console.error("[HistoryScreen.handlePlaySong]", result.error);
      }
    }
  };

  const handleRemoveFromHistory = async (songId: string) => {
    const result = await handleAsync(async () => {
      await removeHistoryEntry(songId);
    }, "Failed to remove from history");

    if (!result.success) {
      if (__DEV__) {
        console.error("[HistoryScreen.handleRemoveFromHistory]", result.error);
      }
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all your listening history? This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            const result = await handleAsync(async () => {
              await clearHistoryStore();
            }, "Failed to clear history");

            if (!result.success) {
              Alert.alert("Error", result.error || "Failed to clear history");
              if (__DEV__) {
                console.error(
                  "[HistoryScreen.handleClearHistory]",
                  result.error,
                );
              }
            }
          },
        },
      ],
    );
  };

  const renderHistoryItem = ({
    item,
  }: {
    item: HistoryEntry;
    index: number;
  }) => {
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
  };

  const renderSectionHeader = ({ section }: { section: HistorySection }) => {
    if (section.title === "Today") return null;
    return (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text variant="titleLarge" style={styles.sectionTitle}>
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
    );
  };

  const totalTracks = sections.reduce(
    (sum, section) => sum + section.data.length,
    0,
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={["#6366f1", "#8b5cf6"]}
        style={styles.emptyIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialIcons name="history" size={64} color="#ffffff" />
      </LinearGradient>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No listening history yet
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
      >
        Songs you play will show up here
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Main Header */}
      <View style={[styles.header]}>
        <View style={styles.headerContent}>
          <Text variant="displaySmall" style={styles.headerTitle}>
            History
          </Text>
          {totalTracks > 0 && (
            <Text
              variant="bodyLarge"
              style={[
                styles.headerSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {totalTracks} song{totalTracks !== 1 ? "s" : ""} played
            </Text>
          )}
        </View>
        {totalTracks > 0 && (
          <TouchableOpacity
            onPress={handleClearHistory}
            style={styles.headerActionButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-outline" size={28} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {totalTracks === 0 ? (
        renderEmptyState()
      ) : (
        <AnimatedSectionList
          sections={sections}
          renderItem={renderHistoryItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => `${item.song.id}-${item.playedAt}`}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadHistory}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPadding },
          ]}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          style={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  fixedHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fixedHeaderTitle: {
    fontWeight: "800",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "900",
    marginBottom: 8,
    fontSize: 36,
  },
  headerSubtitle: {
    fontWeight: "500",
    opacity: 0.8,
  },
  headerActionButton: {
    marginTop: 8,
  },

  clearButton: {
    padding: 4,
  },

  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 0,
  },

  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 18,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.7,
  },

  historyItemContainer: {
    position: "relative",
    paddingVertical: 4,
  },
  trackItemWrapper: {
    paddingRight: 80,
  },
  historyItemActions: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 4,
  },
  playedTime: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.7,
  },
  removeButton: {
    padding: 4,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
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
