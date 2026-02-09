import { TrackItem } from "@/components";
import { LoadingSpinner } from "@/components/common";
import { useDownloadsStore, useSnackbarStore } from "@/stores";
import { usePlayerActions } from "@/stores/playerStore";
import { theme } from "@/utils";

import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Card,
  Chip,
  Divider,
  IconButton,
  ProgressBar,
  Surface,
  Text,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Downloads: React.FC = () => {
  const insets = useSafeAreaInsets();

  const {
    downloads,
    activeDownloads,
    isLoading,
    error,
    loadDownloads,
    deleteDownload,
    cleanupOrphans,
    exportTracks,
  } = useDownloadsStore();

  const { playSong } = usePlayerActions();
  const showSnackbar = useSnackbarStore((state) => state.show);

  const [refreshing, setRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const totalSize = downloads.reduce((sum, d) => sum + d.fileSize, 0);
  const activeDownloadsList = Array.from(activeDownloads.values());

  useEffect(() => {
    loadDownloads();
  }, []);

  useEffect(() => {
    if (error) {
      showSnackbar({ message: error, variant: "error" });
    }
  }, [error]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: activeDownloadsList.length > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeDownloadsList.length]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await cleanupOrphans();
      await loadDownloads();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadDownloads, cleanupOrphans]);

  const handlePlay = useCallback(
    (songId: string) => {
      const download = downloads.find((d) => d.id === songId);
      if (!download) return;

      playSong(
        download.song,
        downloads.map((d) => d.song),
      );
    },
    [downloads, playSong],
  );

  const deleteDownloadById = async (songId: string) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(songId));
      await deleteDownload(songId);
      showSnackbar({
        message: "Download deleted",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "Failed to delete download",
        variant: "error",
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleDelete = useCallback(
    (songId: string) => {
      const download = downloads.find((d) => d.id === songId);
      if (!download) return;

      if (Platform.OS !== "web") {
        Alert.alert(
          "Delete Download",
          `Remove "${download.song.title}" from downloads?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => deleteDownloadById(songId),
            },
          ],
        );
      } else {
        window.confirm(`Remove "${download.song.title}" from downloads?`) &&
          deleteDownloadById(songId);
      }
    },
    [downloads, deleteDownload, showSnackbar],
  );

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === downloads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(downloads.map((d) => d.id)));
    }
  }, [selectedIds.size, downloads]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (selectedIds.size === 0) {
      showSnackbar({ message: "No tracks selected", variant: "info" });
      return;
    }

    try {
      setExporting(true);
      await exportTracks(Array.from(selectedIds));
      showSnackbar({
        message: `Exported ${selectedIds.size} track${selectedIds.size !== 1 ? "s" : ""}`,
        variant: "success",
      });
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      showSnackbar({
        message: "Failed to export tracks",
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  }, [selectedIds, exportTracks, showSnackbar]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const renderActiveDownloads = () => {
    if (activeDownloadsList.length === 0) return null;

    return (
      <Animated.View
        style={[styles.activeDownloadsContainer, { opacity: fadeAnim }]}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons
              name="download"
              size={20}
              color={theme.colors.primary}
              style={styles.sectionIcon}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Downloading
            </Text>
          </View>
          <Chip mode="flat" compact>
            {activeDownloadsList.length} active
          </Chip>
        </View>

        {activeDownloadsList.map((progress) => {
          const download = downloads.find((d) => d.id === progress.id);
          const song = download?.song;

          return (
            <Card
              key={progress.id}
              style={styles.downloadCard}
              mode="elevated"
              elevation={1}
            >
              <Card.Content>
                <View style={styles.downloadCardHeader}>
                  <View style={styles.downloadInfo}>
                    <Text
                      variant="bodyMedium"
                      numberOfLines={1}
                      style={styles.downloadTitle}
                    >
                      {song?.title || "Downloading..."}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                      numberOfLines={1}
                    >
                      {song?.artists?.primary?.[0]?.name || ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <ProgressBar
                    progress={progress.progress / 100}
                    color={theme.colors.primary}
                    style={styles.progressBar}
                  />
                  <View style={styles.progressStats}>
                    <Text variant="bodySmall" style={styles.progressText}>
                      {progress.status === "downloading"
                        ? `${Math.round(progress.progress)}%`
                        : progress.status}
                    </Text>
                    {progress.totalBytes > 0 && (
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.progressText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {formatBytes(progress.downloadedBytes)} /{" "}
                        {formatBytes(progress.totalBytes)}
                      </Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </Animated.View>
    );
  };

  const renderStatsHeader = () => {
    if (downloads.length === 0) return null;

    return (
      <>
        {selectionMode ? (
          <Surface style={styles.selectionHeader} elevation={1}>
            <View style={styles.selectionHeaderContent}>
              <IconButton
                icon="close"
                size={24}
                onPress={toggleSelectionMode}
                iconColor={theme.colors.onSurface}
              />
              <Text variant="titleMedium" style={styles.selectionTitle}>
                {selectedIds.size} selected
              </Text>
              <View style={styles.selectionActions}>
                <IconButton
                  icon={
                    selectedIds.size === downloads.length
                      ? "checkbox-marked"
                      : "checkbox-blank-outline"
                  }
                  size={24}
                  onPress={toggleSelectAll}
                  iconColor={theme.colors.primary}
                />
                <IconButton
                  icon="export"
                  size={24}
                  onPress={handleExport}
                  disabled={selectedIds.size === 0 || exporting}
                  loading={exporting}
                  iconColor={theme.colors.primary}
                />
              </View>
            </View>
          </Surface>
        ) : (
          <Surface style={styles.statsContainer} elevation={0}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons
                  name="storage"
                  size={24}
                  color={theme.colors.primary}
                  style={styles.statIcon}
                />
                <Text variant="bodySmall" style={styles.statLabel}>
                  Storage
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {formatBytes(totalSize)}
                </Text>
              </View>
              {!selectionMode && (
                <>
                  <Divider style={styles.statDivider} />
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={toggleSelectionMode}
                  >
                    <MaterialIcons
                      name="file-copy"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text variant="bodySmall" style={styles.statLabel}>
                      Export
                    </Text>
                    <Text variant="titleLarge" style={styles.statValue}>
                      Export
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Surface>
        )}
      </>
    );
  };

  const renderDownloadItem = useCallback(
    ({ item }: { item: (typeof downloads)[0] }) => {
      const isDeleting = deletingIds.has(item.id);
      const isSelected = selectedIds.has(item.id);

      return (
        <View style={styles.downloadItemContainer}>
          {selectionMode && (
            <IconButton
              icon={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={24}
              onPress={() => toggleSelect(item.id)}
              iconColor={
                isSelected
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
              style={styles.selectCheckbox}
            />
          )}
          <View
            style={[
              styles.trackItemWrapper,
              selectionMode && styles.trackItemCompact,
            ]}
          >
            <TrackItem
              track={item.song}
              onPress={() =>
                selectionMode ? toggleSelect(item.id) : handlePlay(item.id)
              }
              showArtwork
            />
          </View>
          {!selectionMode && (
            <View style={styles.downloadActions}>
              <IconButton
                icon="delete-outline"
                size={22}
                onPress={() => handleDelete(item.id)}
                iconColor={theme.colors.error}
                disabled={isDeleting}
                loading={isDeleting}
                style={styles.deleteButton}
              />
            </View>
          )}
        </View>
      );
    },
    [
      deletingIds,
      selectedIds,
      selectionMode,
      handlePlay,
      handleDelete,
      toggleSelect,
      theme,
    ],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.emptyIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialIcons name="download" size={64} color="#ffffff" />
      </LinearGradient>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Downloads
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
      >
        Downloaded songs will appear here.{"\n"}Download songs to listen
        offline.
      </Text>
    </View>
  );

  if (isLoading && downloads.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {downloads.length === 0 && activeDownloadsList.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {renderActiveDownloads()}
              {renderStatsHeader()}
            </>
          }
          renderItem={renderDownloadItem}
          ItemSeparatorComponent={() => <Divider />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 0,
  },
  activeDownloadsContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  downloadCard: {
    marginBottom: 8,
  },
  downloadCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontWeight: "500",
  },
  progressContainer: {
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontWeight: "500",
  },
  statsContainer: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    marginBottom: 4,
  },
  statLabel: {
    opacity: 0.7,
    fontWeight: "500",
  },
  statValue: {
    fontWeight: "700",
  },
  statDivider: {
    height: 60,
    width: 1,
    marginHorizontal: 16,
  },
  downloadItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  trackItemWrapper: {
    flex: 1,
  },
  trackItemCompact: {
    flex: 1,
    marginLeft: -8,
  },
  selectCheckbox: {
    margin: 0,
    marginLeft: 4,
  },
  selectionHeader: {
    margin: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  selectionTitle: {
    flex: 1,
    fontWeight: "600",
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  downloadActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
    lineHeight: 22,
  },
});

export default Downloads;
