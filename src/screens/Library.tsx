import { COLORS } from "@/constants";
import { TrackItem } from "@/components";
import type { Collection } from "@/services";
import { useLibraryStore, usePlayerStore } from "@/stores";
import { theme, getScreenPaddingBottom } from "@/utils";
import { Models } from "@saavn-labs/sdk";

import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { IconButton, Menu, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

type ModalType = "create" | "rename" | null;

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

const LibraryScreen: React.FC<LibraryScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;
  const { playSong, currentSong } = usePlayerStore();

  const {
    favorites,
    collections,
    selectedCollection,
    activeTab,
    setSelectedCollection,
    setActiveTab,
    loadLibrary,
    createCollection,
    renameCollection,
    deleteCollection,
  } = useLibraryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [collectionName, setCollectionName] = useState("");
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null,
  );
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const loadLibraryData = useCallback(async () => {
    const success = await loadLibrary();
    if (!success) {
      console.error(
        "[LibraryScreen.loadLibraryData]",
        "Failed to load library",
      );
    }
  }, [loadLibrary]);

  useEffect(() => {
    void loadLibraryData();
  }, [loadLibraryData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLibraryData();
    setRefreshing(false);
  }, [loadLibraryData]);

  const handleTrackPress = useCallback(
    (song: Models.Song, songs: Models.Song[]) => {
      playSong(song, songs);
    },
    [playSong],
  );

  const handlePlayAll = useCallback(
    (songs: Models.Song[]) => {
      if (songs.length > 0) {
        playSong(songs[0], songs);
      }
    },
    [playSong],
  );

  const handleCreateCollection = useCallback(async () => {
    try {
      const created = await createCollection(collectionName.trim());

      if (!created) {
        Alert.alert("Error", "Failed to create collection");
        console.error(
          "[LibraryScreen.handleCreateCollection]",
          "create failed",
        );
        return;
      }

      setCollectionName("");
      setModalType(null);
      await loadLibraryData();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create collection",
      );
      console.error("[LibraryScreen.handleCreateCollection]", error);
    }
  }, [collectionName, createCollection, loadLibraryData]);

  const handleRenameCollection = useCallback(async () => {
    if (!editingCollection) return;

    try {
      const success = await renameCollection(
        editingCollection.id,
        collectionName.trim(),
      );

      if (!success) {
        Alert.alert("Error", "Failed to rename collection");
        console.error(
          "[LibraryScreen.handleRenameCollection]",
          "rename failed",
        );
        return;
      }

      setCollectionName("");
      setModalType(null);
      setEditingCollection(null);

      if (selectedCollection?.id === editingCollection.id) {
        setSelectedCollection({
          ...selectedCollection,
          name: collectionName.trim(),
        });
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to rename collection",
      );
      console.error("[LibraryScreen.handleRenameCollection]", error);
    }
  }, [
    editingCollection,
    collectionName,
    selectedCollection,
    setSelectedCollection,
    renameCollection,
  ]);

  const handleDeleteCollection = (collection: Collection) => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Delete Collection",
        `Are you sure you want to delete "${collection.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => deleteCollection(collection.id),
          },
        ],
      );
    } else {
      window.confirm(`Are you sure you want to delete "${collection.name}"?`) &&
        deleteCollection(collection.id);
    }
  };

  const openRenameModal = useCallback((collection: Collection) => {
    setEditingCollection(collection);
    setCollectionName(collection.name);
    setModalType("rename");
    setMenuVisible(null);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingCollection(null);
    setCollectionName("");
    setModalType("create");
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    setCollectionName("");
    setEditingCollection(null);
  }, []);

  const getGradientForCollection = useCallback(
    (index: number) => GRADIENT_COLORS[index % GRADIENT_COLORS.length],
    [],
  );

  const renderEmptyState = useCallback(
    (
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
    ),
    [theme.colors.onSurfaceVariant, theme.colors.primary],
  );

  const renderFavoriteSongs = useMemo(() => {
    if (favorites.length === 0) {
      return renderEmptyState(
        "favorite-border",
        "No liked songs yet",
        "Songs you like will appear here",
      );
    }

    return (
      <View style={styles.contentContainer}>
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

        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={() => handlePlayAll(favorites)}
            style={[styles.playButtonLarge, { backgroundColor: "#1db954" }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="play-arrow" size={32} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.songsListContainer}>
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TrackItem
                track={item}
                onPress={() => handleTrackPress(item, favorites)}
                isActive={currentSong?.id === item.id}
                showArtwork
              />
            )}
            scrollEnabled={false}
          />
        </View>
      </View>
    );
  }, [
    favorites,
    theme.colors,
    currentSong,
    handlePlayAll,
    handleTrackPress,
    renderEmptyState,
  ]);

  const renderCollectionDetail = useMemo(() => {
    if (!selectedCollection) return null;

    const gradientColors = getGradientForCollection(
      collections.findIndex((c) => c.id === selectedCollection.id),
    );

    return (
      <View style={styles.contentContainer}>
        <LinearGradient
          colors={[
            gradientColors[0],
            gradientColors[1],
            theme.colors.background,
          ]}
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
          <>
            {renderEmptyState(
              "library-music",
              "Empty collection",
              "Songs you add to this collection will appear here",
            )}
            <View style={styles.emptyActionsContainer}>
              <TouchableOpacity
                onPress={() => openRenameModal(selectedCollection)}
                style={[
                  styles.emptyActionButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={20} color="#000000" />
                <Text variant="labelLarge" style={styles.emptyActionText}>
                  Rename
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteCollection(selectedCollection)}
                style={[
                  styles.emptyActionButton,
                  { backgroundColor: "#ef4444" },
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="delete" size={20} color="#ffffff" />
                <Text variant="labelLarge" style={styles.emptyDeleteText}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
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
                onPress={() => openRenameModal(selectedCollection)}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="edit"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteCollection(selectedCollection)}
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

            <View style={styles.songsListContainer}>
              <FlatList
                data={selectedCollection.songs}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <TrackItem
                    track={item}
                    onPress={() =>
                      handleTrackPress(item, selectedCollection.songs)
                    }
                    isActive={currentSong?.id === item.id}
                    showArtwork
                  />
                )}
                scrollEnabled={false}
              />
            </View>
          </>
        )}
      </View>
    );
  }, [
    selectedCollection,
    collections,
    theme.colors,
    currentSong,
    getGradientForCollection,
    renderEmptyState,
    handlePlayAll,
    handleTrackPress,
    openRenameModal,
    handleDeleteCollection,
  ]);

  const renderCollectionCard = useCallback(
    ({ item, index }: { item: Collection; index: number }) => {
      const gradientColors = getGradientForCollection(index);

      return (
        <TouchableOpacity
          onPress={() => setSelectedCollection(item)}
          style={styles.collectionCard}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[gradientColors[0], gradientColors[1]]}
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

          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={(e) => {
                  e.stopPropagation();
                  setMenuVisible(item.id);
                }}
                style={styles.menuButton}
              />
            }
          >
            <Menu.Item
              onPress={() => openRenameModal(item)}
              title="Rename"
              leadingIcon="pencil"
            />
            <Menu.Item
              onPress={() => handleDeleteCollection(item)}
              title="Delete"
              leadingIcon="delete"
              titleStyle={{ color: "#ef4444" }}
            />
          </Menu>
        </TouchableOpacity>
      );
    },
    [
      menuVisible,
      theme.colors,
      getGradientForCollection,
      openRenameModal,
      handleDeleteCollection,
    ],
  );

  const renderCollectionsList = useMemo(() => {
    if (collections.length === 0) {
      return renderEmptyState(
        "library-music",
        "No collections yet",
        "Create a collection to organize your music",
        "Create Collection",
        openCreateModal,
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
  }, [collections, renderEmptyState, renderCollectionCard, openCreateModal]);

  const handleModalSubmit = useCallback(() => {
    if (modalType === "create") {
      handleCreateCollection();
    } else if (modalType === "rename") {
      handleRenameCollection();
    }
  }, [modalType, handleCreateCollection, handleRenameCollection]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
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
          ? renderCollectionDetail
          : activeTab === "songs"
            ? renderFavoriteSongs
            : renderCollectionsList}
      </Animated.ScrollView>

      {activeTab === "collections" && !selectedCollection && (
        <TouchableOpacity
          onPress={openCreateModal}
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

      <Modal
        visible={modalType !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
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
                {modalType === "create"
                  ? "New Collection"
                  : "Rename Collection"}
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
                value={collectionName}
                onChangeText={setCollectionName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleModalSubmit}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={closeModal}
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
                  onPress={handleModalSubmit}
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
                    {modalType === "create" ? "Create" : "Rename"}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  contentContainer: {
    flex: 1,
  },
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
  songsListContainer: {
    paddingTop: 8,
  },
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
    paddingRight: 4,
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
  menuButton: {
    margin: 0,
  },
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
  emptyActionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyActionText: {
    color: "#000000",
    fontWeight: "700",
  },
  emptyDeleteText: {
    color: "#ffffff",
    fontWeight: "700",
  },
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
});

export default LibraryScreen;
