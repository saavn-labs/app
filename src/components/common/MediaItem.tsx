import { Image } from "expo-image";
import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

type MediaType = "album" | "artist" | "playlist" | "collection";

interface BaseMediaData {
  id: string;
  images?: Array<{ url: string; quality?: string }>;
  title?: string;
  name?: string;
  subtitle?: string;
}

interface MediaItemProps {
  data: BaseMediaData;
  type: MediaType;
  onPress: () => void;
  horizontal?: boolean;
}

const MediaItem: React.FC<MediaItemProps> = memo(
  ({ data, type, onPress, horizontal = false }) => {
    const theme = useTheme();

    const getImageUrl = (): string => {
      if (!data.images || data.images.length === 0) return "";
      return data.images[2]?.url || data.images[0]?.url || "";
    };

    const getTitle = () => {
      return data.title || data.name || "Unknown";
    };

    const imageUrl = getImageUrl();
    const title = getTitle();
    const isArtist = type === "artist";

    if (horizontal) {
      return (
        <TouchableOpacity
          style={styles.horizontalContainer}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: imageUrl }}
            style={[styles.horizontalArtwork, isArtist && styles.circularImage]}
            contentFit="cover"
            transition={200}
          />
          <Text
            variant="bodyMedium"
            numberOfLines={2}
            style={styles.horizontalTitle}
          >
            {title}
          </Text>
          {data.subtitle && (
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={[
                styles.horizontalSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {data.subtitle}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.verticalContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: imageUrl }}
          style={[styles.verticalArtwork, isArtist && styles.circularImage]}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.textContainer}>
          <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {data.subtitle && (
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {data.subtitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  },
);

MediaItem.displayName = "MediaItem";

const styles = StyleSheet.create({
  horizontalContainer: {
    width: 140,
    marginRight: 12,
  },
  horizontalArtwork: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  horizontalTitle: {
    marginTop: 8,
    fontWeight: "500",
  },
  horizontalSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  verticalContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  verticalArtwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#2a2a2a",
  },
  circularImage: {
    borderRadius: 1000,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "500",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
});

export default MediaItem;
