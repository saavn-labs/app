import TrackItem from "@/components/items/TrackItem";
import { usePlayer } from "@/contexts/PlayerContext";
import { HistoryEntry, historyService } from "@/services/HistoryService";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
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

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<HistoryEntry, HistorySection>,
);

interface HistorySection {
  title: string;
  data: HistoryEntry[];
}

export default function HistoryScreen() {
  const theme = useTheme();
  const [sections, setSections] = useState<HistorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong } = usePlayer();

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const groupHistoryByDate = (history: HistoryEntry[]): HistorySection[] => {
    const grouped: { [key: string]: HistoryEntry[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    history.forEach((entry) => {
      const playedAt = new Date(entry.playedAt);
      playedAt.setHours(0, 0, 0, 0);

      let dateKey: string;
      if (playedAt.getTime() === today.getTime()) {
        dateKey = "Today";
      } else if (playedAt.getTime() === yesterday.getTime()) {
        dateKey = "Yesterday";
      } else if (playedAt.getTime() >= lastWeek.getTime()) {
        dateKey = playedAt.toLocaleString("en-US", { weekday: "long" });
      } else {
        const day = playedAt.getDate();
        const month = playedAt.toLocaleString("en-US", { month: "short" });
        dateKey = `${day} ${month}`;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });

    const sections: HistorySection[] = [];
    Object.keys(grouped).forEach((key) => {
      sections.push({
        title: key,
        data: grouped[key],
      });
    });

    return sections;
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await historyService.getHistory();
      const groupedSections = groupHistoryByDate(data);
      setSections(groupedSections);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (entry: HistoryEntry) => {
    try {
      await playSong(entry.song);
    } catch (error) {
      console.error("Error playing song:", error);
      Alert.alert("Error", "Failed to play song");
    }
  };

  const handleRemoveFromHistory = async (songId: string) => {
    try {
      await historyService.removeFromHistory(songId);
      await loadHistory();
    } catch (error) {
      console.error("Error removing from history:", error);
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
            try {
              await historyService.clearHistory();
              await loadHistory();
            } catch (error) {
              console.error("Error clearing history:", error);
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

  const renderSectionHeader = ({ section }: { section: HistorySection }) => (
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
        style={[styles.sectionCount, { color: theme.colors.onSurfaceVariant }]}
      >
        {section.data.length} song{section.data.length !== 1 ? "s" : ""}
      </Text>
    </View>
  );

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
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
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
    paddingBottom: 120,
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
