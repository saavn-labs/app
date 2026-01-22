const DEFAULT_FALLBACK_COLOR = "#163f24";

export const extractDominantColor = async (
  imageUrl: string,
  fallbackColor: string = DEFAULT_FALLBACK_COLOR,
): Promise<{ color: string }> => {
  try {
    if (!imageUrl) return { color: fallbackColor };
    return { color: fallbackColor };
  } catch (error) {
    console.warn(`Color extraction error for ${imageUrl}:`, error);
    return { color: fallbackColor };
  }
};

/**
 * Generates a gradient array from a base color
 * @param baseColor - The base color to generate gradient from
 * @param opacity1 - Opacity for middle color (default: 0.87)
 * @param opacity2 - Opacity for end color (default: 0.73)
 * @returns Array of colors for gradient
 */
export const createColorGradient = (
  baseColor: string,
  opacity1: number = 0.95,
  opacity2: number = 0.95,
): [string, string, string] => {
  const opacity1Hex = Math.round(opacity1 * 255)
    .toString(16)
    .padStart(2, "0");
  const opacity2Hex = Math.round(opacity2 * 255)
    .toString(16)
    .padStart(2, "0");

  return [
    baseColor,
    `${baseColor}${opacity1Hex.toUpperCase()}`,
    `${baseColor}${opacity2Hex.toUpperCase()}`,
  ];
};
