import EmptyState from "@/components/common/EmptyState";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AlbumItem from "@/components/items/AlbumItem";
import TrackItem from "@/components/items/TrackItem";
import { usePlayer } from "@/contexts/PlayerContext";
import { Album, Artist, Models, Playlist } from "@saavn-labs/sdk";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

const { width, height } = Dimensions.get("window");

type DetailType = "album" | "playlist" | "artist";

interface DetailScreenProps {
  type: DetailType;
  id: string;
  onBack: () => void;
  onAlbumPress?: (albumId: string) => void;
}

interface DetailData {
  id: string;
  title?: string;
  name?: string;
  subtitle?: string;
  images?: Array<{ url: string }>;
  url?: string;
  songs?: Models.Song[] | { top?: Models.Song[] };
  albums?: { top?: Models.Album[] };
  year?: string;
  stats?: { songCount?: number };
}

const HEADER_MAX_HEIGHT = 400;
const HEADER_MIN_HEIGHT = 110;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const DetailScreen: React.FC<DetailScreenProps> = ({
  type,
  id,
  onBack,
  onAlbumPress,
}) => {
  const theme = useTheme();
  const { playSong, currentSong, toggleShuffle, isShuffled } = usePlayer();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"songs" | "albums">("songs");
  const [dominantColor, setDominantColor] = useState("#1a1a1a");

  const scrollY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [id, type]);

  const loadData = useCallback(
    async (isRefreshing = false) => {
      try {
        if (!isRefreshing) setLoading(true);
        setError(null);

        let result: DetailData;
        switch (type) {
          case "album":
            result = await Album.getById({ albumId: id });
            break;
          case "playlist":
            result = await Playlist.getById({ playlistId: id });
            break;
          case "artist":
            result = await Artist.getById({ artistId: id });
            break;
        }

        setData(result);

        const imageUrl = result.images?.[2]?.url || result.images?.[0]?.url;
        if (imageUrl) {
          setDominantColor(type === "artist" ? "#6366f1" : "#1db954");
        }
      } catch (error) {
        console.error(`Error loading ${type}:`, error);
        setError(`Failed to load ${type}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, type],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const getSongs = useCallback((): Models.Song[] => {
    if (!data) return [];
    if (type === "artist") {
      return (data.songs as { top?: Models.Song[] })?.top || [];
    }
    return (data.songs as Models.Song[]) || [];
  }, [data, type]);

  const handlePlayAll = useCallback(() => {
    const songs = getSongs();
    if (songs && songs.length > 0) {
      playSong(songs[0], songs, 0);
    }
  }, [getSongs, playSong]);

  const handleShuffle = useCallback(() => {
    const songs = getSongs();
    if (songs && songs.length > 0) {
      toggleShuffle();
      playSong(songs[0], songs, 0);
    }
  }, [getSongs, playSong, toggleShuffle]);

  const handleTrackPress = useCallback(
    (track: Models.Song, index: number) => {
      const songs = getSongs();
      playSong(track, songs, index);
    },
    [playSong, getSongs],
  );

  const handleShare = useCallback(async () => {
    if (!data) return;
    try {
      const displayName = data.title || data.name || "Unknown";
      const shareUrl =
        data.url || `https://www.jiosaavn.com/${type}/${data.id}`;
      const message =
        type === "artist"
          ? `Check out ${displayName} on JioSaavn\n${shareUrl}`
          : `Check out "${displayName}" on JioSaavn\n${shareUrl}`;

      await Share.share({
        message,
        url: shareUrl,
        title: displayName,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, [data, type]);

  const renderTrackItem = useCallback(
    ({ item, index }: { item: Models.Song; index: number }) => (
      <TrackItem
        track={item}
        onPress={() => handleTrackPress(item, index)}
        showArtwork={type !== "album"}
        showIndex={type === "album"}
        index={index}
        isActive={currentSong?.id === item.id}
      />
    ),
    [handleTrackPress, currentSong, type],
  );

  const renderAlbumItem = useCallback(
    ({ item }: { item: Models.Album }) => (
      <AlbumItem album={item} onPress={() => onAlbumPress?.(item.id)} />
    ),
    [onAlbumPress],
  );

  const keyExtractor = useCallback(
    (item: Models.Song | Models.Album) => item.id,
    [],
  );

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.3, 0],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0, HEADER_SCROLL_DISTANCE],
    outputRange: [1.3, 1, 0.8],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE - 50, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  const miniTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const getMetadata = useMemo(() => {
    if (!data) return "";

    const parts: string[] = [];

    if (type === "album") {
      if (data.year) parts.push(String(data.year));
      if ((data.stats as any)?.songCount) {
        parts.push(`${(data.stats as any).songCount} songs`);
      }
    } else if (type === "playlist") {
      const songs = data.songs as Models.Song[];
      if (songs && songs.length > 0) {
        parts.push(`${songs.length} songs`);
      }
    }

    return parts.join(" • ");
  }, [data, type]);

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title={error || `${type} not found`}
          message="Please try again later"
          actionLabel="Go Back"
          onAction={onBack}
        />
      </View>
    );
  }

  const displayName = data.title || data.name || "Unknown";
  const imageUrl = data.images?.[2]?.url || data.images?.[0]?.url;
  const isArtist = type === "artist";
  const songs = getSongs();

  if (isArtist) {
    return (
      <View style={styles.container}>
        <Animated.ScrollView
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#ffffff"
              colors={["#ffffff"]}
            />
          }
        >
          <LinearGradient
            colors={[
              dominantColor,
              `${dominantColor}dd`,
              `${dominantColor}88`,
              theme.colors.background,
            ]}
            style={styles.artistHeaderGradient}
          >
            <View style={styles.artistHeader}>
              <IconButton
                icon="arrow-left"
                size={24}
                iconColor="#ffffff"
                onPress={onBack}
                style={styles.artistBackButton}
              />

              <Image
                source={{ uri: imageUrl }}
                style={styles.artistArtwork}
                resizeMode="cover"
              />

              <Text variant="displayMedium" style={styles.artistTitle}>
                {displayName}
              </Text>

              {data.subtitle && (
                <Text variant="bodyLarge" style={styles.artistSubtitle}>
                  {data.subtitle}
                </Text>
              )}
            </View>
          </LinearGradient>

          <View
            style={[
              styles.contentWrapper,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Action Buttons */}
            <View style={styles.artistActionsContainer}>
              <TouchableOpacity
                onPress={handlePlayAll}
                style={[
                  styles.playButtonLarge,
                  { backgroundColor: dominantColor },
                ]}
                activeOpacity={0.8}
              >
                <IconButton
                  icon="play"
                  size={28}
                  iconColor="#000000"
                  style={styles.playIconLarge}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShuffle}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <IconButton
                  icon="shuffle"
                  size={24}
                  iconColor={
                    isShuffled ? dominantColor : theme.colors.onSurface
                  }
                  style={styles.actionIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <IconButton
                  icon="share-variant-outline"
                  size={24}
                  iconColor={theme.colors.onSurface}
                  style={styles.actionIcon}
                />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                onPress={() => setSelectedTab("songs")}
                style={[
                  styles.tab,
                  selectedTab === "songs" && {
                    borderBottomColor: dominantColor,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  variant="titleMedium"
                  style={[
                    styles.tabText,
                    selectedTab === "songs" && {
                      color: theme.colors.onSurface,
                    },
                  ]}
                >
                  Popular
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedTab("albums")}
                style={[
                  styles.tab,
                  selectedTab === "albums" && {
                    borderBottomColor: dominantColor,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  variant="titleMedium"
                  style={[
                    styles.tabText,
                    selectedTab === "albums" && {
                      color: theme.colors.onSurface,
                    },
                  ]}
                >
                  Albums
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.artistContent}>
              {selectedTab === "songs" && songs && (
                <FlatList
                  data={songs.slice(0, 10)} // Top 10 for artists
                  renderItem={renderTrackItem}
                  keyExtractor={keyExtractor}
                  scrollEnabled={false}
                  initialNumToRender={10}
                />
              )}

              {selectedTab === "albums" && data.albums?.top && (
                <FlatList
                  data={data.albums.top}
                  renderItem={renderAlbumItem}
                  keyExtractor={keyExtractor}
                  scrollEnabled={false}
                  initialNumToRender={10}
                  numColumns={2}
                  columnWrapperStyle={styles.albumGrid}
                />
              )}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header Bar */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            backgroundColor: theme.colors.background,
            opacity: headerBackgroundOpacity,
          },
        ]}
      >
        <View style={styles.fixedHeaderContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={onBack}
            style={styles.fixedBackButton}
          />

          <Animated.Text
            style={[
              styles.fixedHeaderTitle,
              {
                opacity: miniTitleOpacity,
                color: theme.colors.onSurface,
              },
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Animated.Text>
        </View>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Hero Header with Image */}
        <LinearGradient
          colors={[
            dominantColor,
            `${dominantColor}cc`,
            theme.colors.background,
          ]}
          style={styles.heroHeader}
        >
          <Animated.View
            style={[
              styles.heroImageContainer,
              {
                opacity: imageOpacity,
                transform: [{ scale: imageScale }],
              },
            ]}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>

          <IconButton
            icon="arrow-left"
            size={24}
            iconColor="#ffffff"
            onPress={onBack}
            style={styles.heroBackButton}
          />
        </LinearGradient>

        {/* Title and Metadata */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            <Text variant="headlineLarge" style={styles.mainTitle}>
              {displayName}
            </Text>

            {data.subtitle && (
              <Text
                variant="bodyMedium"
                style={[
                  styles.mainSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {data.subtitle}
              </Text>
            )}

            {getMetadata && (
              <Text
                variant="bodySmall"
                style={[
                  styles.metadata,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {getMetadata}
              </Text>
            )}
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handlePlayAll}
              style={[
                styles.playButtonLarge,
                { backgroundColor: dominantColor },
              ]}
              activeOpacity={0.8}
            >
              <IconButton
                icon="play"
                size={32}
                iconColor="#000000"
                style={styles.playIconLarge}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShuffle}
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <IconButton
                icon="shuffle"
                size={26}
                iconColor={isShuffled ? dominantColor : theme.colors.onSurface}
                style={styles.actionIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <IconButton
                icon="share-variant-outline"
                size={26}
                iconColor={theme.colors.onSurface}
                style={styles.actionIcon}
              />
            </TouchableOpacity>
          </View>

          {/* Track List */}
          <View style={styles.trackList}>
            <FlatList
              data={songs}
              renderItem={renderTrackItem}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          </View>
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
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
    paddingTop: 0,
    height: 56,
  },
  fixedHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 56,
  },
  fixedBackButton: {
    margin: 0,
  },
  fixedHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    flex: 1,
  },

  heroHeader: {
    height: HEADER_MAX_HEIGHT,
    justifyContent: "flex-end",
    paddingBottom: 24,
  },
  heroImageContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  heroImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 16,
  },
  heroBackButton: {
    position: "absolute",
    top: 8,
    left: 8,
    margin: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  infoSection: {
    paddingTop: 20,
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  mainTitle: {
    fontWeight: "800",
    marginBottom: 8,
    fontSize: 32,
    lineHeight: 38,
  },
  mainSubtitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  metadata: {
    fontSize: 13,
    fontWeight: "400",
    opacity: 0.7,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
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
  playIconLarge: {
    margin: 0,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: {
    margin: 0,
  },

  trackList: {
    paddingTop: 8,
  },

  artistHeaderGradient: {
    paddingTop: 80,
  },
  artistHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  artistBackButton: {
    position: "absolute",
    top: -36,
    left: 8,
    margin: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  artistArtwork: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  artistTitle: {
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    color: "#ffffff",
    fontSize: 48,
    lineHeight: 52,
  },
  artistSubtitle: {
    textAlign: "center",
    color: "#ffffffdd",
    fontWeight: "500",
  },

  contentWrapper: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: -12,
  },

  artistActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
  },

  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginRight: 24,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
  },

  artistContent: {
    paddingTop: 8,
  },

  albumGrid: {
    gap: 12,
    paddingHorizontal: 20,
  },
});

export default DetailScreen;
