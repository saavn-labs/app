import { theme } from "@/utils";
import { Image } from "expo-image";
import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

export type MediaType = "album" | "artist" | "playlist" | "collection";

export interface MediaData {
  id: string;
  title?: string;
  name?: string;
  subtitle?: string;
  images?: Array<{ url: string; quality?: string }>;
}

interface GenericMediaItemProps {
  data: MediaData;
  type: MediaType;
  onPress: () => void;
  horizontal?: boolean;
  testID?: string;
}

const GenericMediaItem: React.FC<GenericMediaItemProps> = memo(
  ({ data, type, onPress, horizontal = false, testID }) => {
    const getTitle = (): string => {
      return data.title || data.name || "Unknown";
    };

    const imageUrl = data.images?.[2]?.url;
    const title = getTitle();
    const isCircular = type === "artist";

    const imageStyle = [
      horizontal ? styles.horizontalArtwork : styles.verticalArtwork,
      isCircular && styles.circularImage,
    ];

    if (horizontal) {
      return (
        <TouchableOpacity
          style={styles.horizontalContainer}
          onPress={onPress}
          activeOpacity={0.7}
          testID={testID}
        >
          <Image
            source={{ uri: imageUrl }}
            style={imageStyle}
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
        testID={testID}
      >
        <Image
          source={{ uri: imageUrl }}
          style={imageStyle}
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
  (prevProps, nextProps) => {
    return (
      prevProps.data.id === nextProps.data.id &&
      prevProps.type === nextProps.type &&
      prevProps.horizontal === nextProps.horizontal
    );
  },
);

GenericMediaItem.displayName = "GenericMediaItem";

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

export default GenericMediaItem;
