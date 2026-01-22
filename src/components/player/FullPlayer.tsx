import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Models } from "@saavn-labs/sdk";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { usePlayer } from "../../contexts/PlayerContext";
import { storageService } from "../../services/StorageService";
import {
  createColorGradient,
  extractDominantColor,
} from "../../utils/colorUtils";
import { TrackItem } from "../items";

const { width } = Dimensions.get("window");

interface FullPlayerProps {
  visible: boolean;
  onClose: () => void;
}

const FullPlayer: React.FC<FullPlayerProps> = ({ visible, onClose }) => {
  const {
    currentSong,
    status,
    progress,
    duration,
    queue,
    currentIndex,
    isShuffled,
    repeatMode,
    togglePlayPause,
    playSong,
    playNext,
    playPrevious,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [seekValue, setSeekValue] = useState(progress);
  const [isDragging, setIsDragging] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [dominantColor, setDominantColor] = useState("#1a1a1a");

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
      extractDominantColor(currentSong.images[0].url).then(({ color }) => {
        setDominantColor(color);
      });
    }
  }, [currentSong?.id]);

  useEffect(() => {
    if (!isDragging) {
      setSeekValue(progress);
    }
  }, [progress, isDragging]);

  useEffect(() => {
    if (currentSong) {
      storageService.isFavorite(currentSong.id).then(setIsFavorited);
    }
  }, [currentSong?.id]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case "one":
        return "repeat-one-on";
      case "all":
        return "repeat";
      default:
        return "repeat";
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekChange = (value: number) => {
    setSeekValue(value);
  };

  const handleSeekComplete = (value: number) => {
    setIsDragging(false);
    seekTo(value);
  };

  const toggleFavorite = async () => {
    if (!currentSong) return;

    if (isFavorited) {
      await storageService.removeFavorite(currentSong.id);
      setIsFavorited(false);
    } else {
      await storageService.addFavorite(currentSong);
      setIsFavorited(true);
    }
  };

  const handleTrackPress = useCallback(
    (track: Models.Song) => {
      const trackIndex = queue.findIndex((t) => t.id === track.id);
      playSong(track, queue, trackIndex);
    },
    [queue, playSong],
  );

  const gradient = createColorGradient(dominantColor);

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
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={[styles.header]}>
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
                  Playing from {queue.length > 0 ? "Queue" : "Search"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.headerButton}
                activeOpacity={0.7}
                onPress={() => {}}
              >
                <MaterialIcons name="share" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Album Art */}
            <View style={styles.artworkContainer}>
              <View style={styles.artworkShadow}>
                <Image
                  source={{
                    uri:
                      currentSong.images?.[2]?.url ||
                      currentSong.images?.[0]?.url,
                  }}
                  style={styles.artwork}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Song Info */}
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
                onPress={toggleFavorite}
                style={styles.favoriteButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={isFavorited ? "favorite" : "favorite-border"}
                  size={28}
                  color={isFavorited ? "#1db954" : "#ffffff"}
                />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
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
                  {formatTime(progress)}
                </Text>
                <Text variant="bodySmall" style={styles.timeText}>
                  {formatTime(duration)}
                </Text>
              </View>
            </View>

            {/* Playback Controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                onPress={toggleShuffle}
                style={styles.secondaryControl}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="shuffle"
                  size={26}
                  color={isShuffled ? "#1db954" : "rgba(255, 255, 255, 0.7)"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={playPrevious}
                style={styles.skipControl}
                activeOpacity={0.7}
              >
                <MaterialIcons name="skip-previous" size={40} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayPause}
                style={styles.playButton}
                activeOpacity={0.8}
                disabled={status === "loading"}
              >
                <MaterialIcons
                  name={status === "playing" ? "pause" : "play-arrow"}
                  size={48}
                  color="#000000"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={playNext}
                style={styles.skipControl}
                activeOpacity={0.7}
              >
                <MaterialIcons name="skip-next" size={40} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={cycleRepeatMode}
                style={styles.secondaryControl}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={getRepeatIcon()}
                  size={26}
                  color={
                    repeatMode !== "off"
                      ? "#1db954"
                      : "rgba(255, 255, 255, 0.7)"
                  }
                />
              </TouchableOpacity>
            </View>

            <View style={styles.queueContainer}>
              <View style={styles.queueHeader}>
                <Text variant="titleLarge" style={styles.queueTitle}>
                  Up Next
                </Text>
                <Text variant="bodyMedium" style={styles.queueCount}>
                  {queue.length} song{queue.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.queueList}>
                {queue.map((song, index) => (
                  <View
                    key={`${song.id}-${index}`}
                    style={[
                      styles.queueItemWrapper,
                      index === currentIndex && styles.currentQueueItem,
                    ]}
                  >
                    <TrackItem
                      track={song}
                      onPress={() => handleTrackPress(song)}
                      showArtwork={true}
                      isActive={index === currentIndex}
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
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
    gap: 8,
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

  additionalControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 32,
  },
  additionalButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  queueContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  queueTitle: {
    fontWeight: "800",
    color: "#ffffff",
  },
  queueCount: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  queueList: {
    paddingHorizontal: 8,
  },
  queueItemWrapper: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4,
  },
  currentQueueItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },

  bottomSpacer: {
    height: 40,
  },
});

export default FullPlayer;
