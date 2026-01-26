import { create } from "zustand";

export type SnackbarVariant = "info" | "success" | "error" | "warning";

interface SnackbarState {
  visible: boolean;
  message: string;
  actionLabel?: string;
  variant: SnackbarVariant;
  duration: number;
  onAction?: () => void;
  show: (options: {
    message: string;
    variant?: SnackbarVariant;
    duration?: number;
    actionLabel?: string;
    onAction?: () => void;
  }) => void;
  hide: () => void;
}

const DEFAULT_DURATION = 3000;

export const useSnackbarStore = create<SnackbarState>((set, get) => ({
  visible: false,
  message: "",
  actionLabel: undefined,
  variant: "info",
  duration: DEFAULT_DURATION,
  onAction: undefined,
  show: ({
    message,
    variant = "info",
    duration = DEFAULT_DURATION,
    actionLabel,
    onAction,
  }) => {
    set({
      visible: true,
      message,
      variant,
      duration,
      actionLabel,
      onAction,
    });
  },
  hide: () => {
    if (get().visible) {
      set({ visible: false, onAction: undefined, actionLabel: undefined });
    }
  },
}));
