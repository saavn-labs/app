import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Portal, Snackbar } from "react-native-paper";

import { SnackbarVariant, useSnackbarStore } from "@/stores/snackbarStore";
import { getScreenPaddingBottom } from "@/utils";

const variantConfig: Record<
  SnackbarVariant,
  {
    backgroundColor: string;
    textColor: string;
  }
> = {
  info: {
    backgroundColor: "#2196F3",
    textColor: "#FFFFFF",
  },
  success: {
    backgroundColor: "#4CAF50",
    textColor: "#FFFFFF",
  },
  error: {
    backgroundColor: "#F44336",
    textColor: "#FFFFFF",
  },
  warning: {
    backgroundColor: "#FF9800",
    textColor: "#FFFFFF",
  },
};

const GlobalSnackbar: React.FC = () => {
  const { visible, message, variant, duration, actionLabel, onAction, hide } =
    useSnackbarStore();

  const config = useMemo(() => variantConfig[variant], [variant]);

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={hide}
        duration={duration}
        action={
          actionLabel
            ? {
                label: actionLabel,
                onPress: () => {
                  onAction?.();
                  hide();
                },
                textColor: config.textColor,
              }
            : undefined
        }
        style={[
          styles.snackbar,
          {
            backgroundColor: config.backgroundColor,
            marginBottom: getScreenPaddingBottom() + 12,
          },
        ]}
        wrapperStyle={styles.wrapper}
        theme={{
          colors: {
            onSurface: config.textColor,
            inverseOnSurface: config.textColor,
          },
        }}
      >
        {message}
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  snackbar: {
    marginHorizontal: 12,
    borderRadius: 8,
    elevation: 8,
  },
});

export default GlobalSnackbar;
