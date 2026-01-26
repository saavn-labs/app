import { theme } from "@/utils";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = "large",
  fullScreen = false,
}) => {
  const containerStyle = fullScreen
    ? [styles.fullScreenContainer, { backgroundColor: theme.colors.background }]
    : styles.inlineContainer;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <Text
          variant="bodyMedium"
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineContainer: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    marginTop: 16,
    textAlign: "center",
  },
});

export default LoadingSpinner;
