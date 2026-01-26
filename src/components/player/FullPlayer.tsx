import { useLibraryStore } from "@/stores";
import {
  useCurrentSong,
  useDominantColor,
  useDuration,
  usePlaybackStatus,
  usePlayerActions,
  useProgress,
  useRepeatMode,
  useSetDominantColor,
  useUpcomingTracks,
} from "@/stores/playerStore";
import {
  theme,
  formatTime,
  createColorGradient,
  extractAndUpdateColor,
} from "@/utils";
import { Models } from "@saavn-labs/sdk";

import TrackItem from "../items/TrackItem";
import LoadingHeartbeat from "./LoadingHeartBeat";
import { TrackContextMenu } from "../common";

import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";

const { width } = Dimensions.get("window");

interface FullPlayerProps {
  visible: boolean;
  onClose: () => void;
}

const FullPlayer: React.FC<FullPlayerProps> = ({ visible, onClose }) => {
  const currentSong = useCurrentSong();
  const status = usePlaybackStatus();
  const progress = useProgress();
  const duration = useDuration();
  const dominantColor = useDominantColor();
  const setDominantColor = useSetDominantColor();
  const upcomingTracks = useUpcomingTracks();
  const repeatMode = useRepeatMode();
  const { isFavorite, toggleFavorite: toggleFavoriteInStore } =
    useLibraryStore();

  const { togglePlayPause, playSong, next, seekTo, toggleRepeatMode } =
    usePlayerActions();

  const [seekValue, setSeekValue] = useState(progress);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  useEffect(() => {
    if (currentSong?.images?.[0]?.url) {
      extractAndUpdateColor(currentSong.images[0].url, setDominantColor);
    }
  }, [currentSong?.id, setDominantColor]);

  useEffect(() => {
    if (!isDragging) {
      setSeekValue(progress);
    }
  }, [progress, isDragging]);

  const getRepeatIcon = useCallback(() => {
    return repeatMode === "all"
      ? "repeat"
      : repeatMode === "one"
        ? "repeat-one"
        : "repeat";
  }, [repeatMode]);

  const handleSeekStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSeekChange = useCallback(
    (value: number) => {
      if (isDragging) {
        setSeekValue(value);
      }
    },
    [isDragging],
  );

  const handleSeekComplete = useCallback(
    (value: number) => {
      seekTo(value);
      setSeekValue(value);
      setTimeout(() => setIsDragging(false), 100);
    },
    [seekTo],
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!currentSong) return;
    await toggleFavoriteInStore(currentSong);
  }, [currentSong, toggleFavoriteInStore]);

  const handleMenuPress = useCallback((e: any) => {
    e?.stopPropagation?.();
    setShowMenu(true);
  }, []);

  const handleMenuDismiss = useCallback(() => {
    setShowMenu(false);
  }, []);

  const gradient = createColorGradient(dominantColor);

  const handleTrackPress = useCallback(
    async (track: Models.Song) => {
      await playSong(track);
    },
    [playSong],
  );

  const renderUpNextItem = useCallback(
    ({ item }: { item: Models.Song }) => (
      <TrackItem
        track={item}
        onPress={() => handleTrackPress(item)}
        isActive={false}
      />
    ),
    [handleTrackPress],
  );

  if (!currentSong) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
    >
      <LinearGradient colors={gradient} style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: slideAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={36}
                  color="#ffffff"
                />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text variant="labelMedium" style={styles.headerTitle}>
                  Now Playing
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleMenuPress}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="more-vert"
                  size={36}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>

              <TrackContextMenu
                visible={showMenu}
                track={currentSong}
                onDismiss={handleMenuDismiss}
              />
            </View>

            <View style={styles.artworkContainer}>
              <View style={styles.artworkShadow}>
                <Image
                  source={{ uri: currentSong.images?.[2]?.url }}
                  style={styles.artwork}
                  contentFit="cover"
                />
              </View>
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.songInfo}>
                <Text
                  variant="headlineMedium"
                  style={styles.songTitle}
                  numberOfLines={2}
                >
                  {currentSong.title}
                </Text>
                <Text
                  variant="bodyLarge"
                  style={styles.artistName}
                  numberOfLines={1}
                >
                  {currentSong.subtitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={styles.favoriteButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={
                    isFavorite(currentSong.id) ? "favorite" : "favorite-border"
                  }
                  size={28}
                  color={isFavorite(currentSong.id) ? "#1db954" : "#ffffff"}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={seekValue}
                onValueChange={handleSeekChange}
                onSlidingStart={handleSeekStart}
                onSlidingComplete={handleSeekComplete}
                minimumTrackTintColor="#ffffff"
                maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                thumbTintColor="#ffffff"
              />
              <View style={styles.timeContainer}>
                <Text variant="bodySmall" style={styles.timeText}>
                  {formatTime(isDragging ? seekValue : progress)}
                </Text>
                <Text variant="bodySmall" style={styles.timeText}>
                  {formatTime(duration)}
                </Text>
              </View>
            </View>

            <View style={styles.controlsContainer}>
              <TouchableOpacity
                onPress={toggleRepeatMode}
                style={styles.secondaryControl}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={getRepeatIcon()}
                  size={30}
                  color={
                    repeatMode !== "off"
                      ? "#1db954"
                      : "rgba(255, 255, 255, 0.7)"
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayPause}
                style={styles.playButton}
                activeOpacity={0.8}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <LoadingHeartbeat color="#000000" size={48} />
                ) : (
                  <MaterialIcons
                    name={status === "playing" ? "pause" : "play-arrow"}
                    size={48}
                    color="#000000"
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={next}
                style={styles.skipControl}
                activeOpacity={0.7}
              >
                <MaterialIcons name="skip-next" size={40} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {upcomingTracks.length > 0 && (
              <View style={styles.upNextContainer}>
                <Text style={styles.upNextHeader}>Up Next</Text>
                <FlatList
                  data={upcomingTracks}
                  renderItem={renderUpNextItem}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  scrollEnabled={false}
                />
              </View>
            )}

            <View style={styles.bottomSpacer} />
          </Animated.ScrollView>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontSize: 11,
  },
  artworkContainer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 40,
    paddingHorizontal: 24,
  },
  artworkShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 24,
  },
  artwork: {
    width: width - 48,
    height: width - 48,
    borderRadius: 8,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  songInfo: {
    flex: 1,
    marginRight: 16,
  },
  songTitle: {
    fontWeight: "800",
    marginBottom: 8,
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 32,
  },
  artistName: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    fontWeight: "500",
  },
  favoriteButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 30,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  skipControl: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  upNextContainer: {
    paddingHorizontal: 8,
    marginTop: 32,
    marginBottom: 16,
  },
  upNextHeader: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.3,
    paddingHorizontal: 20,
  },
});

export default FullPlayer;
