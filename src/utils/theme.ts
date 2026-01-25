export const colors = {
  primary: "#1DB954",
  secondary: "#1ed760",
  background: "#121212",
  surface: "#282828",
  surfaceVariant: "#333333",
  onSurface: "#ffffff",
  onSurfaceVariant: "#b3b3b3",
  error: "#cf6679",
  onError: "#000000",
  outline: "#404040",
} as const;

export const theme = {
  colors,
  roundness: 12,
} as const;

export const shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;
