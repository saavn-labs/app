export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const sizes = {
  tabBarHeight: 60,
  compactPlayerHeight: 74,
} as const;

export const getScreenPaddingBottom = (
  includePlayer = true,
  includeTabBar = true,
): number => {
  let padding = 0;
  if (includeTabBar) padding += sizes.tabBarHeight;
  if (includePlayer) padding += sizes.compactPlayerHeight;
  return padding;
};
