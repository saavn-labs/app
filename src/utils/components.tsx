/**
 * Common component utilities
 */

import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { spacing } from "./designSystem";
import { colors } from "./theme";

export interface EmptyStateProps {
  title: string;
  message: string;
  actionButton?: ReactNode;
  style?: ViewStyle;
}

export const createEmptyStateView = (props: EmptyStateProps) => (
  <View style={[emptyStateStyles.container, props.style]}>
    <Text variant="headlineSmall" style={emptyStateStyles.title}>
      {props.title}
    </Text>
    <Text variant="bodyMedium" style={emptyStateStyles.message}>
      {props.message}
    </Text>
    {props.actionButton && (
      <View style={emptyStateStyles.buttonContainer}>{props.actionButton}</View>
    )}
  </View>
);

const emptyStateStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    minHeight: 400,
  },
  title: {
    color: colors.onSurface,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  message: {
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
});
