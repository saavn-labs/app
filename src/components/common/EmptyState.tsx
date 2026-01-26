import { theme } from "@/utils";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>
      {message && (
        <Text
          variant="bodyMedium"
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    minWidth: 120,
  },
});

export default EmptyState;
