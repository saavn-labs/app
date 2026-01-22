import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../../contexts/PlayerContext";
import {
  createColorGradient,
  extractDominantColor,
} from "../../utils/colorUtils";

interface CompactPlayerProps {
  onPress: () => void;
  style?: ViewStyle;
}

const DEFAULT_COLOR = "#1a1a1a";

const CompactPlayer: React.FC<CompactPlayerProps> = ({ onPress, style }) => {
  const { currentSong, status, progress, duration, togglePlayPause, playNext } =
    usePlayer();
  const [dominantColor, setDominantColor] = useState(DEFAULT_COLOR);
  const insets = useSafeAreaInsets();

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = 0;
  }

  useEffect(() => {
    if (currentSong?.images?.[0]?.url) {
      extractDominantColor(currentSong.images[0].url).then(({ color }) => {
        setDominantColor(color);
      });
    }
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? progress / duration : 0;
  const gradient = createColorGradient(dominantColor);

  const dynamicPosition: ViewStyle = {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: tabBarHeight > 0 ? tabBarHeight + 8 : insets.bottom + 8,
  };

  return (
    <View style={[styles.container, dynamicPosition, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent * 100}%` },
            ]}
          />
        </View>

        <TouchableOpacity
          onPress={onPress}
          style={styles.content}
          activeOpacity={0.9}
        >
          <View style={styles.leftContent}>
            {/* Artwork with shadow */}
            <View style={styles.artworkContainer}>
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

            {/* Track Info */}
            <View style={styles.textContainer}>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
                {currentSong.title}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={styles.subtitle}
              >
                {currentSong.subtitle}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={togglePlayPause}
              style={styles.playButton}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={status === "playing" ? "pause" : "play-arrow"}
                size={28}
                color="#FFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                playNext();
              }}
              style={styles.nextButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="skip-next" size={34} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  gradient: {
    borderRadius: 12,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  progressBarFill: {
    height: 2,
    backgroundColor: "#FFF",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  artworkContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: "700",
    marginBottom: 2,
    color: "#FFF",
    fontSize: 14,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CompactPlayer;
