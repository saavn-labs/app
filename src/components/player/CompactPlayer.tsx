import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import { usePlayer } from "../../contexts/PlayerContext";
import {
  createColorGradient,
  extractDominantColor,
} from "../../utils/colorUtils";
import { spacing } from "../../utils/designSystem";

interface CompactPlayerProps {
  onPress: () => void;
  style?: ViewStyle;
}

const DEFAULT_COLOR = "#1a1a1a";

const CompactPlayer: React.FC<CompactPlayerProps> = ({ onPress, style }) => {
  const { currentSong, status, progress, duration, togglePlayPause, playNext } =
    usePlayer();
  const [dominantColor, setDominantColor] = useState(DEFAULT_COLOR);
  const [scaleAnim] = useState(new Animated.Value(1));

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

  const handleNextPress = (e: any) => {
    e.stopPropagation();
    playNext();
  };

  return (
    <View style={[styles.container, style]}>
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
              disabled={status === "loading"}
            >
              <MaterialIcons
                name={status === "playing" ? "pause" : "play-arrow"}
                size={28}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextPress}
              style={styles.nextButton}
              activeOpacity={0.8}
              disabled={status === "loading"}
            >
              <MaterialIcons name="skip-next" size={34} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginBottom: spacing.xs,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    borderRadius: 8,
    flex: 1,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
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
    borderRadius: 4,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontWeight: "600",
    marginBottom: 2,
    color: "#FFFFFF",
    fontSize: 14,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    letterSpacing: 0.1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 20,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CompactPlayer;
