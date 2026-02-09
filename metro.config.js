// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = ["react-native", "browser", "main"];
config.resolver.sourceExts = [...config.resolver.sourceExts];
config.resolver.platforms = ["ios", "android", "native", "web"];

config.resolver.unstable_enablePackageExports = true;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName),
    };
  }

  if (platform === "android" || platform === "ios") {
    const result = context.resolveRequest(context, moduleName, platform);
    if (
      result &&
      result.type === "sourceFile" &&
      result.filePath.endsWith(".web.js")
    ) {
      try {
        return context.resolveRequest(context, moduleName, "native");
      } catch {
        return context.resolveRequest(context, moduleName, null);
      }
    }
    return result;
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
