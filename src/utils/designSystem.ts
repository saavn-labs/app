export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export const sizes = {
  tabBarHeight: 60,
  compactPlayerHeight: 74,
};

export const getScreenPaddingBottom = (
  includePlayer: boolean = true,
  includeTabBar: boolean = true,
): number => {
  let padding = 0;
  if (includeTabBar) padding += sizes.tabBarHeight;
  if (includePlayer) padding += sizes.compactPlayerHeight;
  return padding;
};
