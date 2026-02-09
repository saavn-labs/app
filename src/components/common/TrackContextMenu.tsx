import {
  usePlayerStore,
  useLibraryStore,
  useSnackbarStore,
  useDownloadsStore,
} from "@/stores";
import { formatShareMessage } from "@/utils/formatters";
import { theme } from "@/utils";
import { Models } from "@saavn-labs/sdk";

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Share,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Divider,
  List,
  Portal,
  Surface,
  Text,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

interface TrackContextMenuProps {
  visible: boolean;
  track: Models.Song;
  onDismiss: () => void;
  onComplete?: () => void;
}

const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  visible,
  track,
  onDismiss,
  onComplete,
}) => {
  const insets = useSafeAreaInsets();

  const { addToQueue, addNextInQueue } = usePlayerStore();
  const { collections, favorites, toggleFavorite, addToCollection } =
    useLibraryStore();
  const { downloadTrack, isDownloaded, getProgress } = useDownloadsStore();
  const showSnackbar = useSnackbarStore((state) => state.show);

  const [showCollections, setShowCollections] = useState(false);

  const downloaded = isDownloaded(track.id);
  const downloadProgress = getProgress(track.id);
  const isDownloading = downloadProgress?.status === "downloading";

  useEffect(() => {
    if (!visible) {
      setShowCollections(false);
    }
  }, [visible]);

  const isFavorite = useMemo(
    () => favorites.some((s) => s.id === track.id),
    [favorites, track.id],
  );

  const subtitle = useMemo(() => {
    if (track.subtitle) return track.subtitle;
    const parts = [];
    if (track.artists?.primary) {
      const artistNames = track.artists.primary.map((a) => a.name).join(", ");
      if (artistNames) parts.push(artistNames);
    }
    if (track.album?.title) parts.push(track.album.title);
    return parts.join(" - ") || "Unknown";
  }, [track]);

  const handleToggleFavorite = useCallback(async () => {
    try {
      await toggleFavorite(track);
      showSnackbar({
        message: isFavorite ? "Removed from favorites" : "Added to favorites",
        variant: "success",
      });
      onComplete?.();
      onDismiss();
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showSnackbar({
        message: "Failed to update favorites",
        variant: "error",
      });
    }
  }, [track, onComplete, onDismiss, toggleFavorite, isFavorite, showSnackbar]);

  const handleAddToQueue = useCallback(() => {
    addToQueue(track);
    showSnackbar({ message: "Added to queue", variant: "success" });
    onComplete?.();
    onDismiss();
  }, [addToQueue, track, onComplete, onDismiss, showSnackbar]);

  const handlePlayNext = useCallback(() => {
    addNextInQueue(track);
    showSnackbar({ message: "Will play next", variant: "success" });
    onComplete?.();
    onDismiss();
  }, [addNextInQueue, track, onComplete, onDismiss, showSnackbar]);

  const handleAddToCollection = useCallback(
    async (collectionId: string) => {
      try {
        const success = await addToCollection(collectionId, track);
        if (!success) {
          throw new Error("Add to collection failed");
        }
        setShowCollections(false);
        showSnackbar({ message: "Added to collection", variant: "success" });
        onComplete?.();
        onDismiss();
      } catch (error) {
        console.error("Error adding to collection:", error);
        showSnackbar({
          message: "Failed to add to collection",
          variant: "error",
        });
      }
    },
    [track, onComplete, onDismiss, addToCollection, showSnackbar],
  );

  const handleShare = useCallback(async () => {
    try {
      const shareData = formatShareMessage(track);
      await Share.share(shareData);
      onDismiss();
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, [track, onDismiss]);

  const handleGoToArtist = useCallback(() => {
    onDismiss();
    if (track.artists?.primary && track.artists.primary.length > 0) {
      const artistId = track.artists.primary[0].id;
      if (artistId) {
        router.push(`/artist/${artistId}`);
      }
    } else {
      showSnackbar({
        message: "Artist information not available",
        variant: "warning",
      });
    }
  }, [track, router, onDismiss, showSnackbar]);

  const handleGoToAlbum = useCallback(() => {
    onDismiss();
    if (track.album?.id) {
      router.push(`/album/${track.album.id}`);
    } else {
      showSnackbar({
        message: "Album information not available",
        variant: "warning",
      });
    }
  }, [track, router, onDismiss, showSnackbar]);

  const handleDownload = useCallback(async () => {
    try {
      if (downloaded) {
        showSnackbar({ message: "Already downloaded", variant: "info" });
        onDismiss();
        return;
      }

      await downloadTrack(track);

      showSnackbar({
        message: `Downloaded "${track.title}"`,
        variant: "success",
      });
      onDismiss();
    } catch (err) {
      console.error("Download failed:", err);
      const message =
        err instanceof Error ? err.message : "Failed to download track";
      showSnackbar({ message, variant: "error" });
    }
  }, [track, downloaded, downloadTrack, onDismiss, showSnackbar]);

  const renderMainMenu = () => (
    <>
      <Surface style={styles.header} elevation={0}>
        <Text variant="titleMedium" style={styles.headerTitle}>
          {track.title}
        </Text>
        <Text
          variant="bodySmall"
          style={[
            styles.headerSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {subtitle}
        </Text>
      </Surface>
      <Divider />
      <List.Item
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        left={(props) => (
          <List.Icon
            {...props}
            icon={isFavorite ? "heart" : "heart-outline"}
            color={isFavorite ? theme.colors.primary : undefined}
          />
        )}
        onPress={handleToggleFavorite}
        style={styles.listItem}
      />
      <List.Item
        title="Add to Collection"
        left={(props) => <List.Icon {...props} icon="playlist-plus" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => setShowCollections(true)}
        style={styles.listItem}
      />
      <List.Item
        title="Add to Queue"
        left={(props) => <List.Icon {...props} icon="playlist-music" />}
        onPress={handleAddToQueue}
        style={styles.listItem}
      />
      <List.Item
        title="Play Next"
        left={(props) => <List.Icon {...props} icon="skip-next" />}
        onPress={handlePlayNext}
        style={styles.listItem}
      />
      <List.Item
        title="Share"
        left={(props) => <List.Icon {...props} icon="share-variant" />}
        onPress={handleShare}
        style={styles.listItem}
      />
      <List.Item
        title={downloaded ? "Downloaded" : "Download"}
        left={(props) =>
          isDownloading ? (
            <ActivityIndicator size={24} style={{ marginLeft: 14 }} />
          ) : (
            <List.Icon
              {...props}
              icon={downloaded ? "check-circle" : "download"}
              color={downloaded ? theme.colors.primary : undefined}
            />
          )
        }
        onPress={handleDownload}
        disabled={isDownloading || downloaded}
        style={styles.listItem}
      />
      {track.artists?.primary && track.artists.primary.length > 0 && (
        <List.Item
          title="Go to Artist"
          left={(props) => <List.Icon {...props} icon="account-music" />}
          onPress={handleGoToArtist}
          style={styles.listItem}
        />
      )}
      {track.album?.id && (
        <List.Item
          title="Go to Album"
          left={(props) => <List.Icon {...props} icon="album" />}
          onPress={handleGoToAlbum}
          style={styles.listItem}
        />
      )}
    </>
  );

  const renderCollectionsMenu = () => (
    <>
      <Surface style={styles.header} elevation={0}>
        <View style={styles.collectionsHeader}>
          <TouchableOpacity
            onPress={() => setShowCollections(false)}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <List.Icon icon="arrow-left" />
          </TouchableOpacity>
          <Text variant="titleMedium" style={styles.headerTitle}>
            Add to Collection
          </Text>
        </View>
      </Surface>
      <Divider />
      {collections.length === 0 ? (
        <View style={styles.emptyState}>
          <List.Icon icon="playlist-music-outline" />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No collections yet
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Create one in Library to organize your music
          </Text>
        </View>
      ) : (
        collections.map((collection) => (
          <List.Item
            key={collection.id}
            title={collection.name}
            left={(props) => <List.Icon {...props} icon="playlist-music" />}
            onPress={() => handleAddToCollection(collection.id)}
            style={styles.listItem}
          />
        ))
      )}
    </>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onRequestClose={onDismiss}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <Surface
                style={[
                  styles.menu,
                  {
                    paddingBottom: insets.bottom,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                elevation={4}
              >
                <View style={styles.menuContent}>
                  {showCollections ? renderCollectionsMenu() : renderMainMenu()}
                </View>
              </Surface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  menuContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  collectionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    marginLeft: -8,
  },
  listItem: {
    paddingVertical: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontWeight: "500",
    marginTop: 8,
  },
});

export default memo(TrackContextMenu);
