import TrackItem from "@/components/items/TrackItem";
import { COLORS } from "@/constants";
import { usePlayer } from "@/contexts/PlayerContext";
import { Collection, collectionService } from "@/services/CollectionService";
import { storageService } from "@/services/StorageService";
import { getScreenPaddingBottom } from "@/utils/designSystem";
import { handleAsync, logError } from "@/utils/errorHandler";

import { MaterialIcons } from "@expo/vector-icons";
import { Models } from "@saavn-labs/sdk";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LibraryTab = "songs" | "collections";

interface LibraryScreenProps {
  onCollectionPress?: (collectionId: string) => void;
}

const GRADIENT_COLORS = [
  ["#6366f1", "#8b5cf6"],
  ["#ec4899", "#f43f5e"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#059669"],
  ["#3b82f6", "#2563eb"],
  ["#8b5cf6", "#7c3aed"],
  ["#06b6d4", "#0891b2"],
  ["#f97316", "#ea580c"],
];

const LibraryScreen: React.FC<LibraryScreenProps> = ({ onCollectionPress }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;
  const { playSong, currentSong, toggleShuffle } = usePlayer();
  const [activeTab, setActiveTab] = useState<LibraryTab>("songs");
  const [favorites, setFavorites] = useState<Models.Song[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    const result = await handleAsync(async () => {
      const [favs, colls] = await Promise.all([
        storageService.getFavorites(),
        collectionService.getCollections(),
      ]);
      return { favs, colls };
    }, "Failed to load library data");

    if (result.success && result.data) {
      setFavorites(result.data.favs);
      setCollections(result.data.colls);
    } else {
      logError("LibraryScreen.loadLibraryData", result.error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLibraryData();
    setRefreshing(false);
  };

  const handleTrackPress = (
    song: Models.Song,
    songs: Models.Song[],
    index: number,
  ) => {
    playSong(song, songs, index);
  };

  const handlePlayAll = (songs: Models.Song[]) => {
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
    }
  };

  const handleShuffle = (songs: Models.Song[]) => {
    if (songs.length > 0) {
      toggleShuffle();
      playSong(songs[0], songs, 0);
    }
  };

  const handleRemoveFavorite = async (songId: string) => {
    await storageService.removeFavorite(songId);
    await loadLibraryData();
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert("Error", "Collection name cannot be empty");
      return;
    }

    const result = await handleAsync(async () => {
      await collectionService.createCollection(newCollectionName.trim());
      setNewCollectionName("");
      setShowCreateModal(false);
      await loadLibraryData();
    }, "Failed to create collection");

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to create collection");
      logError("LibraryScreen.handleCreateCollection", result.error);
    }
  };

  const handleDeleteCollection = (collectionId: string, name: string) => {
    Alert.alert(
      "Delete Collection",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await handleAsync(async () => {
              await collectionService.deleteCollection(collectionId);
              await loadLibraryData();
            }, "Failed to delete collection");

            if (!result.success) {
              Alert.alert(
                "Error",
                result.error || "Failed to delete collection",
              );
              logError("LibraryScreen.handleDeleteCollection", result.error);
            }
          },
        },
      ],
    );
  };

  const getGradientForCollection = (index: number) => {
    return GRADIENT_COLORS[index % GRADIENT_COLORS.length];
  };

  const renderEmptyState = (
    icon: string,
    title: string,
    subtitle: string,
    actionLabel?: string,
    onAction?: () => void,
  ) => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons
          name={icon as any}
          size={80}
          color={theme.colors.onSurfaceVariant}
          style={styles.emptyIcon}
        />
      </View>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
      >
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[
            styles.emptyButton,
            { backgroundColor: theme.colors.primary },
          ]}
          activeOpacity={0.8}
        >
          <Text variant="labelLarge" style={styles.emptyButtonText}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFavoriteSongs = () => {
    if (favorites.length === 0) {
      return renderEmptyState(
        "favorite-border",
        "No liked songs yet",
        "Songs you like will appear here",
      );
    }

    return (
      <View style={styles.contentContainer}>
        {/* Hero Header */}
        <LinearGradient
          colors={[COLORS.PRIMARY, "#1aa34a", theme.colors.background]}
          style={styles.favoritesHeader}
        >
          <View style={styles.favoritesHeroContent}>
            <View style={styles.favoritesIconContainer}>
              <MaterialIcons name="favorite" size={64} color="#ffffff" />
            </View>
            <Text variant="displaySmall" style={styles.favoritesTitle}>
              Liked Songs
            </Text>
            <Text variant="bodyLarge" style={styles.favoritesMeta}>
              {favorites.length} song{favorites.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={() => handlePlayAll(favorites)}
            style={[styles.playButtonLarge, { backgroundColor: "#1db954" }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="play-arrow" size={32} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleShuffle(favorites)}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="shuffle"
              size={24}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>
        </View>

        {/* Songs List */}
        <View style={styles.songsListContainer}>
          {favorites.map((song, index) => (
            <TrackItem
              key={song.id}
              track={song}
              onPress={() => handleTrackPress(song, favorites, index)}
              isActive={currentSong?.id === song.id}
              showArtwork
            />
          ))}
        </View>
      </View>
    );
  };

  const renderCollectionDetail = () => {
    if (!selectedCollection) return null;

    const gradientColors = getGradientForCollection(
      collections.findIndex((c) => c.id === selectedCollection.id),
    );

    return (
      <View style={styles.contentContainer}>
        {/* Header */}
        <LinearGradient
          colors={
            [
              gradientColors[0],
              gradientColors[1],
              theme.colors.background,
            ] as const
          }
          style={styles.collectionDetailHeader}
        >
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor="#ffffff"
            onPress={() => setSelectedCollection(null)}
            style={styles.detailBackButton}
          />

          <View style={styles.collectionDetailContent}>
            <View style={styles.collectionDetailIconContainer}>
              <MaterialIcons name="library-music" size={64} color="#ffffff" />
            </View>
            <Text variant="displaySmall" style={styles.collectionDetailTitle}>
              {selectedCollection.name}
            </Text>
            <Text variant="bodyLarge" style={styles.collectionDetailMeta}>
              {selectedCollection.songs.length} song
              {selectedCollection.songs.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </LinearGradient>

        {selectedCollection.songs.length === 0 ? (
          renderEmptyState(
            "library-music",
            "Empty collection",
            "Songs you add to this collection will appear here",
          )
        ) : (
          <>
            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                onPress={() => handlePlayAll(selectedCollection.songs)}
                style={[
                  styles.playButtonLarge,
                  { backgroundColor: gradientColors[0] },
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="play-arrow" size={32} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleShuffle(selectedCollection.songs)}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="shuffle"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleDeleteCollection(
                    selectedCollection.id,
                    selectedCollection.name,
                  );
                  setSelectedCollection(null);
                }}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={24}
                  color="#ef4444"
                />
              </TouchableOpacity>
            </View>

            {/* Songs List */}
            <View style={styles.songsListContainer}>
              {selectedCollection.songs.map((song, index) => (
                <TrackItem
                  key={song.id}
                  track={song}
                  onPress={() =>
                    handleTrackPress(song, selectedCollection.songs, index)
                  }
                  isActive={currentSong?.id === song.id}
                  showArtwork
                />
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderCollectionCard = ({
    item,
    index,
  }: {
    item: Collection;
    index: number;
  }) => {
    const gradientColors = getGradientForCollection(index);

    return (
      <TouchableOpacity
        onPress={() => setSelectedCollection(item)}
        style={styles.collectionCard}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1]] as const}
          style={styles.collectionCover}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="library-music" size={40} color="#ffffff" />
        </LinearGradient>
        <View style={styles.collectionCardInfo}>
          <Text numberOfLines={1} style={styles.collectionCardName}>
            {item.name}
          </Text>
          <Text style={styles.collectionCardMeta}>
            {item.songs.length} song{item.songs.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
    );
  };

  const renderCollectionsList = () => {
    if (collections.length === 0) {
      return renderEmptyState(
        "library-music",
        "No collections yet",
        "Create a collection to organize your music",
        "Create Collection",
        () => setShowCreateModal(true),
      );
    }

    return (
      <View style={styles.collectionsListContainer}>
        <FlatList
          data={collections}
          renderItem={renderCollectionCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.collectionsList}
        />
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Main Header */}
      <View style={[styles.header]}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab("songs");
              setSelectedCollection(null);
            }}
            style={[
              styles.tab,
              activeTab === "songs" && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="favorite"
              size={18}
              color={activeTab === "songs" ? "#000000" : theme.colors.onSurface}
            />
            <Text
              variant="labelLarge"
              style={[
                styles.tabLabel,
                {
                  color:
                    activeTab === "songs" ? "#000000" : theme.colors.onSurface,
                },
              ]}
            >
              Liked Songs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("collections")}
            style={[
              styles.tab,
              activeTab === "collections" && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="library-music"
              size={18}
              color={
                activeTab === "collections" ? "#000000" : theme.colors.onSurface
              }
            />
            <Text
              variant="labelLarge"
              style={[
                styles.tabLabel,
                {
                  color:
                    activeTab === "collections"
                      ? "#000000"
                      : theme.colors.onSurface,
                },
              ]}
            >
              Collections
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {selectedCollection
          ? renderCollectionDetail()
          : activeTab === "songs"
            ? renderFavoriteSongs()
            : renderCollectionsList()}
      </Animated.ScrollView>

      {/* FAB for Creating Collections */}
      {activeTab === "collections" && !selectedCollection && (
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primary,
              bottom: bottomPadding + 8,
            },
          ]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={28} color="#000000" />
        </TouchableOpacity>
      )}

      {/* Create Collection Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                New Collection
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    color: theme.colors.onSurface,
                  },
                ]}
                placeholder="Give your collection a name"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateCollection}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewCollectionName("");
                  }}
                  style={styles.modalButton}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="labelLarge"
                    style={{ color: theme.colors.onSurface }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreateCollection}
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    variant="labelLarge"
                    style={styles.modalButtonPrimaryText}
                  >
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
    paddingBottom: 16,
  },
  fixedHeaderTitle: {
    fontWeight: "800",
  },

  // Main Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontWeight: "900",
    marginBottom: 20,
    fontSize: 36,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    gap: 6,
  },
  tabLabel: {
    fontWeight: "700",
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  contentContainer: {
    flex: 1,
  },

  // Favorites Header
  favoritesHeader: {
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  favoritesHeroContent: {
    alignItems: "center",
  },
  favoritesIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  favoritesTitle: {
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
    fontSize: 36,
  },
  favoritesMeta: {
    color: "#ffffffdd",
    fontWeight: "500",
  },

  // Collection Detail Header
  collectionDetailHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  detailBackButton: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  collectionDetailContent: {
    alignItems: "center",
  },
  collectionDetailIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  collectionDetailTitle: {
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
    fontSize: 32,
  },
  collectionDetailMeta: {
    color: "#ffffffdd",
    fontWeight: "500",
  },

  // Action Buttons
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  playButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Songs List
  songsListContainer: {
    paddingTop: 8,
  },

  // Collections List
  collectionsListContainer: {
    paddingTop: 16,
  },
  collectionsList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  collectionCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  collectionCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  collectionCardName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#ffffff",
  },
  collectionCardMeta: {
    fontSize: 13,
    color: "#b3b3b3",
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
    opacity: 0.3,
  },
  emptyIcon: {
    opacity: 1,
  },
  emptyTitle: {
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyButtonText: {
    color: "#000000",
    fontWeight: "700",
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontWeight: "700",
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  modalButtonPrimary: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalButtonPrimaryText: {
    color: "#000000",
    fontWeight: "700",
  },

  bottomPadding: {
    backgroundColor: "transparent",
  },
});

export default LibraryScreen;
