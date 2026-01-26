import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { theme } from "@/utils";

const { width } = Dimensions.get("window");

interface DetailScreenHeaderProps {
  imageUrl?: string;
  title: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string | number }>;
  onBack: () => void;
  onPlayAll: () => void;
  onShuffle?: () => void;
  onMore?: () => void;
  rounded?: boolean;
}

const DetailScreenHeader: React.FC<DetailScreenHeaderProps> = ({
  imageUrl,
  title,
  subtitle,
  metadata,
  onBack,
  onPlayAll,
  onShuffle,
  onMore,
  rounded = false,
}) => {
  return (
    <LinearGradient
      colors={["#404040", "#282828", "#121212"]}
      style={styles.header}
    >
      <IconButton
        icon="arrow-left"
        size={28}
        iconColor="#ffffff"
        onPress={onBack}
        style={styles.backButton}
      />

      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.artwork, rounded && styles.artworkRounded]}
        />
      )}

      <Text variant="headlineMedium" style={styles.title}>
        {title}
      </Text>

      {subtitle && (
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          {subtitle}
        </Text>
      )}

      {metadata && metadata.length > 0 && (
        <View style={styles.metadata}>
          {metadata.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Text style={styles.dot}>•</Text>}
              <Text
                variant="bodySmall"
                style={[
                  styles.metadataText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {item.value}
              </Text>
            </React.Fragment>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={onPlayAll}
          style={styles.playButton}
          icon="play"
          buttonColor={theme.colors.primary}
          textColor="#000000"
        >
          Play All
        </Button>
        {onShuffle && (
          <IconButton
            icon="shuffle"
            size={28}
            iconColor={theme.colors.onSurface}
            onPress={onShuffle}
          />
        )}
        {onMore && (
          <IconButton
            icon="dots-vertical"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={onMore}
          />
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 8,
    zIndex: 1,
  },
  artwork: {
    width: width - 80,
    height: width - 80,
    borderRadius: 8,
    marginBottom: 24,
    marginTop: 48,
  },
  artworkRounded: {
    borderRadius: (width - 80) / 2,
  },
  title: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metadataText: {
    fontSize: 13,
  },
  dot: {
    marginHorizontal: 8,
    color: "#b3b3b3",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  playButton: {
    borderRadius: 24,
  },
});

export default memo(DetailScreenHeader);
