// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = ["browser", "react-native", "main"];
config.resolver.sourceExts = [
  "web.ts",
  "web.tsx",
  "web.js",
  "web.jsx",
  ...config.resolver.sourceExts,
];
config.resolver.platforms = ["web", "ios", "android", "native"];

config.resolver.unstable_enablePackageExports = true;
config.resolver.resolveRequest = (context, moduleName, platform) => {
   
    if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
        //? Resolve to its CommonJS entry (fallback to main/index.js)
        return {
            type: 'sourceFile',
            //? require.resolve will pick up the CJS entry (index.js) since "exports" is bypassed
            filePath: require.resolve(moduleName),
        };
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
