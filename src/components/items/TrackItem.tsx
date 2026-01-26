import { theme, formatTrackSubtitle } from "@/utils";
import { Models } from "@saavn-labs/sdk";

import { MaterialIcons } from "@expo/vector-icons";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import TrackContextMenu from "../common/TrackContextMenu";

interface TrackItemProps {
  track: Models.Song;
  onPress: () => void;
  showArtwork?: boolean;
  showIndex?: boolean;
  index?: number;
  isActive?: boolean;
  onMenuAction?: () => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  track,
  onPress,
  showArtwork = true,
  showIndex = false,
  index,
  isActive = false,
  onMenuAction,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const subtitle = useMemo(() => formatTrackSubtitle(track), [track]);

  const handleMenuPress = useCallback((e: any) => {
    e?.stopPropagation?.();
    setShowMenu(true);
  }, []);

  const handleMenuDismiss = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleMenuComplete = useCallback(() => {
    onMenuAction?.();
  }, [onMenuAction]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.leftContent}>
        {showIndex && typeof index === "number" ? (
          <View style={styles.indexContainer}>
            {isActive ? (
              <MaterialIcons
                name="play-arrow"
                size={20}
                color={theme.colors.primary}
              />
            ) : (
              <Text
                variant="bodyMedium"
                style={[
                  styles.indexText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
        ) : showArtwork && track.images?.[0]?.url ? (
          <View style={styles.artworkContainer}>
            <Image
              source={{ uri: track.images[1].url }}
              style={styles.artwork}
              resizeMode="cover"
            />
            {isActive && (
              <View style={styles.playingOverlay}>
                <MaterialIcons name="equalizer" size={20} color="#ffffff" />
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.textContainer}>
          <Text
            variant="bodyLarge"
            numberOfLines={1}
            style={[styles.title, isActive && { color: theme.colors.primary }]}
          >
            {track.title}
          </Text>
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleMenuPress}
        style={styles.menuButton}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons
          name="more-vert"
          size={22}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      <TrackContextMenu
        visible={showMenu}
        track={track}
        onDismiss={handleMenuDismiss}
        onComplete={handleMenuComplete}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  activeContainer: {
    borderLeftWidth: 3,
    paddingLeft: 13,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  indexContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  indexText: {
    fontWeight: "500",
    fontSize: 15,
  },
  artworkContainer: {
    position: "relative",
    marginRight: 12,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  playingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontWeight: "500",
    marginBottom: 4,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.8,
    letterSpacing: 0.1,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default memo(TrackItem);
