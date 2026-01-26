import { imageColorCache } from "./cache";

type ColorUpdateCallback = (color: string) => void;

const DEFAULT_FALLBACK_COLOR = "#163f24";

let getColorsFunction: any = null;

try {
  const imageColorsModule = require("react-native-image-colors");
  getColorsFunction = imageColorsModule.getColors;
} catch {
  console.warn("react-native-image-colors not available");
}

export const extractDominantColor = async (
  imageUrl: string,
  fallbackColor: string = DEFAULT_FALLBACK_COLOR,
): Promise<{ color: string }> => {
  if (!imageUrl) return { color: fallbackColor };

  const cached = imageColorCache.get(imageUrl);
  if (cached) return { color: cached };

  let color = fallbackColor;

  if (getColorsFunction) {
    try {
      const result = await getColorsFunction(imageUrl, {
        fallback: fallbackColor,
        quality: "low",
        pixelSpacing: 5,
      });

      color = result.darkVibrant || fallbackColor;
    } catch (error) {
      console.warn("Color extraction failed:", error);
    }
  }

  imageColorCache.set(imageUrl, color);
  return { color };
};

export const extractAndUpdateColor = async (
  imageUrl: string,
  onColorExtracted: ColorUpdateCallback,
  fallbackColor: string = DEFAULT_FALLBACK_COLOR,
): Promise<void> => {
  const { color } = await extractDominantColor(imageUrl, fallbackColor);
  onColorExtracted(color);
};

export const createColorGradient = (
  baseColor: string,
  opacity1: number = 0.95,
  opacity2: number = 0.95,
): [string, string, string] => {
  const toHex = (opacity: number) =>
    Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return [
    baseColor,
    `${baseColor}${toHex(opacity1)}`,
    `${baseColor}${toHex(opacity2)}`,
  ];
};
