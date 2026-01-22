import { usePlayer } from "@/contexts/PlayerContext";
import { Collection, collectionService } from "@/services/CollectionService";
import { storageService } from "@/services/StorageService";
import { Models } from "@saavn-labs/sdk";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Alert,
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
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const theme = useTheme();
  const router = useRouter();
  const { addToQueue, addNextInQueue } = usePlayer();
  const insets = useSafeAreaInsets();
  const [showCollections, setShowCollections] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    } else {
      // Reset state when menu closes
      setShowCollections(false);
    }
  }, [visible, track.id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [colls, isFav] = await Promise.all([
        collectionService.getCollections(),
        storageService.isFavorite(track.id),
      ]);
      setCollections(colls);
      setIsFavorite(isFav);
    } catch (error) {
      console.error("Error loading menu data:", error);
    } finally {
      setLoading(false);
    }
  }, [track.id]);

  const handleToggleFavorite = useCallback(async () => {
    try {
      if (isFavorite) {
        await storageService.removeFavorite(track.id);
      } else {
        await storageService.addFavorite(track);
      }
      onComplete?.();
      onDismiss();
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "Failed to update favorites");
    }
  }, [isFavorite, track, onComplete, onDismiss]);

  const handleAddToQueue = useCallback(() => {
    addToQueue(track);
    onComplete?.();
    onDismiss();
  }, [addToQueue, track, onComplete, onDismiss]);

  const handlePlayNext = useCallback(() => {
    addNextInQueue(track);
    onComplete?.();
    onDismiss();
  }, [addNextInQueue, track, onComplete, onDismiss]);

  const handleAddToCollection = useCallback(
    async (collectionId: string) => {
      try {
        await collectionService.addToCollection(collectionId, track);
        setShowCollections(false);
        onComplete?.();
        onDismiss();
      } catch (error) {
        console.error("Error adding to collection:", error);
        Alert.alert("Error", "Failed to add to collection");
      }
    },
    [track, onComplete, onDismiss],
  );

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = track.url || `https://www.jiosaavn.com/song/${track.id}`;
      const artistsText =
        track.artists?.primary?.map((a) => a.name).join(", ") || track.subtitle;
      const message = `Check out "${track.title}" by ${artistsText} on JioSaavn`;

      await Share.share({
        message: `${message}\n${shareUrl}`,
        url: shareUrl,
        title: track.title,
      });
      onDismiss();
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, [track, onDismiss]);

  const handleGoToArtist = useCallback(() => {
    onDismiss();
    // Extract artist ID from track data
    if (track.artists?.primary && track.artists.primary.length > 0) {
      const artistId = track.artists.primary[0].id;
      if (artistId) {
        router.push(`/artist/${artistId}`);
      }
    } else {
      Alert.alert("Info", "Artist information not available");
    }
  }, [track, router, onDismiss]);

  const handleGoToAlbum = useCallback(() => {
    onDismiss();
    if (track.album?.id) {
      router.push(`/album/${track.album.id}`);
    } else {
      Alert.alert("Info", "Album information not available");
    }
  }, [track, router, onDismiss]);

  const getSubtitle = useCallback(() => {
    if (track.subtitle) return track.subtitle;

    const parts = [];
    if (track.artists?.primary) {
      const artistNames = track.artists.primary.map((a) => a.name).join(", ");
      if (artistNames) parts.push(artistNames);
    }
    if (track.album?.title) parts.push(track.album.title);

    return parts.join(" - ") || "Unknown";
  }, [track]);

  const renderMainMenu = () => (
    <View style={styles.menuContent}>
      <View style={styles.header}>
        <Text
          variant="titleMedium"
          numberOfLines={1}
          style={styles.headerTitle}
        >
          {track.title}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[
            styles.headerSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {getSubtitle()}
        </Text>
      </View>
      <Divider />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <>
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
            left={(props) => <List.Icon {...props} icon="playlist-play" />}
            onPress={handlePlayNext}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title="Share"
            left={(props) => <List.Icon {...props} icon="share-variant" />}
            onPress={handleShare}
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
      )}
    </View>
  );

  const renderCollectionsMenu = () => (
    <View style={styles.menuContent}>
      <View style={[styles.header, styles.collectionsHeader]}>
        <TouchableOpacity
          onPress={() => setShowCollections(false)}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <List.Icon icon="arrow-left" />
        </TouchableOpacity>
        <Text variant="titleMedium">Add to Collection</Text>
      </View>
      <Divider />
      {collections.length === 0 ? (
        <View style={styles.emptyState}>
          <List.Icon icon="music-box-multiple-outline" />
          <Text
            variant="bodyMedium"
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            No collections yet
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            Create one in Library to organize your music
          </Text>
        </View>
      ) : (
        collections.map((collection) => (
          <List.Item
            key={collection.id}
            title={collection.name}
            description={`${collection.songs.length} song${collection.songs.length !== 1 ? "s" : ""}`}
            left={(props) => <List.Icon {...props} icon="music-box-multiple" />}
            onPress={() => handleAddToCollection(collection.id)}
            style={styles.listItem}
          />
        ))
      )}
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <Surface
                style={[
                  styles.menu,
                  {
                    backgroundColor: theme.colors.elevation.level2,
                    paddingBottom: insets.bottom,
                  },
                ]}
                elevation={5}
              >
                {showCollections ? renderCollectionsMenu() : renderMainMenu()}
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
  loadingContainer: {
    padding: 24,
    alignItems: "center",
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

// Memoize to prevent unnecessary re-renders
export default memo(TrackContextMenu);
