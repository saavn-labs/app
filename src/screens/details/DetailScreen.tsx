import {
  CompactPlayer,
  EmptyState,
  FullPlayer,
  LoadingSpinner,
  TrackItem,
} from "@/components";
import { COLORS } from "@/constants";
import { useDetailStore, usePlayerStore } from "@/stores";
import { getScreenPaddingBottom, handleAsync, theme } from "@/utils";
import { Album, Artist, Models, Playlist } from "@saavn-labs/sdk";

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { IconButton, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HEADER_MAX_HEIGHT = 400;
const HEADER_MIN_HEIGHT = 110;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

type DetailType = "album" | "playlist" | "artist";

interface DetailScreenProps {
  type: DetailType;
  id: string;
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

const DetailScreen: React.FC<DetailScreenProps> = ({
  type,
  id,
  onAlbumPress,
}) => {
  const insets = useSafeAreaInsets();
  const { playSong, currentSong } = usePlayerStore();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dominantColor, setDominantColor] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const {
    selectedTab,
    setSelectedTab,
    isFullPlayerVisible,
    setFullPlayerVisible,
  } = useDetailStore();

  const scrollY = useRef(new Animated.Value(0)).current;
  const bottomPadding = getScreenPaddingBottom(true, false) + insets.bottom;

  useEffect(() => {
    loadData();
  }, [id, type]);

  const onBack = () => {
    router.push("/");
  };

  const loadData = useCallback(
    async (isRefreshing = false) => {
      if (!isRefreshing) setLoading(true);
      setError(null);

      const result = await handleAsync(async () => {
        switch (type) {
          case "album":
            return await Album.getById({ albumId: id });
          case "playlist":
            return await Playlist.getById({ playlistId: id });
          case "artist":
            return await Artist.getById({ artistId: id });
        }
      }, `Failed to load ${type}`);

      if (result.success && result.data) {
        setData(result.data as DetailData);

        const imageUrl =
          result.data.images?.[2]?.url || result.data.images?.[0]?.url;

        if (imageUrl) {
          const defaultColor = type === "artist" ? "#6366f1" : COLORS.PRIMARY;
          const dominantColorResult = await handleAsync(async () => {
            const { extractDominantColor } = await import("@/utils/colorUtils");
            return await extractDominantColor(imageUrl);
          }, "Failed to extract dominant color");

          const colorToUse =
            dominantColorResult.success && dominantColorResult.data
              ? dominantColorResult.data.color
              : defaultColor;

          setDominantColor(colorToUse);
        }
      } else {
        setError(result.error || `Failed to load ${type}`);
        console.error(`[DetailScreen.loadData.${type}]`, result.error);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [id, type],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const songs = useMemo((): Models.Song[] => {
    if (!data) return [];
    if (type === "artist") {
      return (data.songs as { top?: Models.Song[] })?.top || [];
    }
    return (data.songs as Models.Song[]) || [];
  }, [data, type]);

  const handlePlayAll = useCallback(() => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  }, [songs, playSong]);

  const handleTrackPress = useCallback(
    (track: Models.Song) => {
      playSong(track, songs);
    },
    [playSong, songs],
  );

  const handleShare = useCallback(async () => {
    if (!data) return;

    const result = await handleAsync(async () => {
      const displayName = data.title || data.name || "Unknown";
      const shareUrl = `https://sausico.pages.dev/${type}/${data.id}`;
      const message = `Check out ${displayName} on Sausico\n${shareUrl}`;

      await Share.share({
        message,
        title: displayName,
      });
    }, "Failed to share");

    if (!result.success) {
      console.error("[DetailScreen.handleShare]", result.error);
    }
  }, [data, type]);

  const metadata = useMemo(() => {
    if (!data) return "";

    const parts: string[] = [];

    if (type === "album") {
      if (data.year) parts.push(String(data.year));
      if ((data.stats as any)?.songCount) {
        parts.push(`${(data.stats as any).songCount} songs`);
      }
    } else if (type === "playlist") {
      const playlistSongs = data.songs as Models.Song[];
      if (playlistSongs?.length) {
        parts.push(`${playlistSongs.length} songs`);
      }
    }

    return parts.join(" • ");
  }, [data, type]);

  const renderTrackItem = useCallback(
    ({ item, index }: { item: Models.Song; index: number }) => (
      <TrackItem
        track={item}
        onPress={() => handleTrackPress(item)}
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
      <TouchableOpacity
        onPress={() => onAlbumPress?.(item.id)}
        style={styles.albumItemRow}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.images[2].url }}
          style={styles.albumArtwork}
          resizeMode="cover"
        />

        <View style={styles.albumInfo}>
          <Text
            variant="titleMedium"
            numberOfLines={1}
            style={[styles.albumRowTitle, { color: theme.colors.onSurface }]}
          >
            {item.title || "Unknown Album"}
          </Text>

          {item.subtitle && (
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={[
                styles.albumRowSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {item.subtitle}
            </Text>
          )}

          <View style={styles.albumMetadata}>
            {item.year && (
              <Text
                variant="labelSmall"
                style={[
                  styles.albumMetadataText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {item.year}
              </Text>
            )}
            {item.year && (item as any).songCount && (
              <Text
                variant="labelSmall"
                style={[
                  styles.albumMetadataText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {" • "}
              </Text>
            )}
            {(item as any).songCount && (
              <Text
                variant="labelSmall"
                style={[
                  styles.albumMetadataText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {(item as any).songCount} songs
              </Text>
            )}
          </View>
        </View>

        <IconButton
          icon="chevron-right"
          size={20}
          iconColor={theme.colors.onSurfaceVariant}
          style={styles.albumChevron}
        />
      </TouchableOpacity>
    ),
    [onAlbumPress, theme],
  );

  const keyExtractor = useCallback(
    (item: Models.Song | Models.Album) => item.id,
    [],
  );

  const animatedStyles = useMemo(
    () => ({
      imageOpacity: scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
        outputRange: [1, 0.3, 0],
        extrapolate: "clamp",
      }),
      imageScale: scrollY.interpolate({
        inputRange: [-100, 0, HEADER_SCROLL_DISTANCE],
        outputRange: [1.3, 1, 0.8],
        extrapolate: "clamp",
      }),
      titleOpacity: scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE - 50, HEADER_SCROLL_DISTANCE],
        outputRange: [1, 1, 0],
        extrapolate: "clamp",
      }),
      titleTranslateY: scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [0, -20],
        extrapolate: "clamp",
      }),
      miniTitleOpacity: scrollY.interpolate({
        inputRange: [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
      headerBackgroundOpacity: scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    }),
    [scrollY],
  );

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
  const imageUrl = data.images?.[2]?.url;
  const isArtist = type === "artist";

  if (isArtist) {
    const topSongs = songs;
    const albums = data.albums?.top || [];

    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.fixedHeader,
            {
              backgroundColor: theme.colors.background,
              opacity: animatedStyles.headerBackgroundOpacity,
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
                  opacity: animatedStyles.miniTitleOpacity,
                  color: theme.colors.onSurface,
                },
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Animated.Text>
          </View>
        </Animated.View>

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
          <LinearGradient
            colors={[
              dominantColor || COLORS.PRIMARY,
              `${dominantColor || COLORS.PRIMARY}cc`,
              theme.colors.background,
            ]}
            style={styles.heroHeader}
          >
            <Animated.View
              style={[
                styles.heroImageContainer,
                {
                  opacity: animatedStyles.imageOpacity,
                  transform: [{ scale: animatedStyles.imageScale }],
                },
              ]}
            >
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.heroImage,
                  { borderRadius: styles.heroImage.width / 2 },
                ]}
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
                  opacity: animatedStyles.titleOpacity,
                  transform: [{ translateY: animatedStyles.titleTranslateY }],
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
            </Animated.View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={handlePlayAll}
                style={[
                  styles.playButtonLarge,
                  { backgroundColor: COLORS.PRIMARY },
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

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                onPress={() => setSelectedTab("songs")}
                style={[
                  styles.tab,
                  selectedTab === "songs" && {
                    borderBottomColor: dominantColor || COLORS.PRIMARY,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  variant="titleMedium"
                  style={[
                    styles.tabText,
                    {
                      color:
                        selectedTab === "songs"
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
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
                    borderBottomColor: dominantColor || COLORS.PRIMARY,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  variant="titleMedium"
                  style={[
                    styles.tabText,
                    {
                      color:
                        selectedTab === "albums"
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Albums
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.artistContent}>
              {selectedTab === "songs" && (
                <>
                  {topSongs.length > 0 ? (
                    <FlatList
                      data={topSongs}
                      renderItem={renderTrackItem}
                      keyExtractor={keyExtractor}
                      scrollEnabled={false}
                    />
                  ) : (
                    <View style={styles.emptyTabContent}>
                      <Text
                        variant="bodyLarge"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        No popular songs available
                      </Text>
                    </View>
                  )}
                </>
              )}

              {selectedTab === "albums" && (
                <>
                  {albums.length > 0 ? (
                    <FlatList
                      data={albums}
                      renderItem={renderAlbumItem}
                      keyExtractor={keyExtractor}
                      scrollEnabled={false}
                    />
                  ) : (
                    <View style={styles.emptyTabContent}>
                      <Text
                        variant="bodyLarge"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        No albums available
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          <View style={{ height: bottomPadding + 20 }} />
        </Animated.ScrollView>

        <CompactPlayer
          onPress={() => setFullPlayerVisible(true)}
          style={styles.compactPlayerOffset}
        />

        <FullPlayer
          visible={isFullPlayerVisible}
          onClose={() => setFullPlayerVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            backgroundColor: theme.colors.background,
            opacity: animatedStyles.headerBackgroundOpacity,
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
                opacity: animatedStyles.miniTitleOpacity,
                color: theme.colors.onSurface,
              },
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Animated.Text>
        </View>
      </Animated.View>

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
        <LinearGradient
          colors={[
            dominantColor || COLORS.PRIMARY,
            `${dominantColor || COLORS.PRIMARY}cc`,
            theme.colors.background,
          ]}
          style={styles.heroHeader}
        >
          <Animated.View
            style={[
              styles.heroImageContainer,
              {
                opacity: animatedStyles.imageOpacity,
                transform: [{ scale: animatedStyles.imageScale }],
              },
            ]}
          >
            <Image
              source={{ uri: imageUrl }}
              style={[styles.heroImage, { borderRadius: 4 }]}
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
                opacity: animatedStyles.titleOpacity,
                transform: [{ translateY: animatedStyles.titleTranslateY }],
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

            {metadata && (
              <Text
                variant="bodySmall"
                style={[
                  styles.metadata,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {metadata}
              </Text>
            )}
          </Animated.View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handlePlayAll}
              style={[
                styles.playButtonLarge,
                { backgroundColor: COLORS.PRIMARY },
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

          <View style={styles.trackList}>
            <FlatList
              data={songs}
              renderItem={renderTrackItem}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
            />
          </View>
        </View>

        <View style={{ height: bottomPadding + 20 }} />
      </Animated.ScrollView>

      <CompactPlayer
        onPress={() => setFullPlayerVisible(true)}
        style={styles.compactPlayerOffset}
      />

      <FullPlayer
        visible={isFullPlayerVisible}
        onClose={() => setFullPlayerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  compactPlayerOffset: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
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
    minHeight: 200,
  },
  emptyTabContent: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  albumItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  albumArtwork: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  albumInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  albumRowTitle: {
    fontWeight: "600",
  },
  albumRowSubtitle: {
    fontSize: 13,
    opacity: 0.8,
  },
  albumMetadata: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  albumMetadataText: {
    fontSize: 12,
    opacity: 0.6,
  },
  albumChevron: {
    margin: 0,
  },
  albumItemContainer: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 52) / 2,
  },
  albumTextContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  albumTitle: {
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 18,
  },
  albumSubtitle: {
    fontSize: 12,
    marginBottom: 2,
    opacity: 0.8,
  },
  albumYear: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
});

export default DetailScreen;
