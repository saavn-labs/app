<!-- Banner (replace with your image or remove) -->
<p align="center">
	<img src="assets/images/banner.png" alt="Saavn Music" width="100%" />
</p>

# Saavn Music (Saavn Labs App)

A full-featured Expo/React Native app to browse and play music from JioSaavn, powered by `@saavn-labs/sdk` and `react-native-track-player`.

## Features

- Rich browsing: Home, Search, Library, and History screens
- Detail views: Albums, Artists, and Playlists with track lists
- Powerful playback: background audio, queue, seek, and media controls
- Player UIs: compact mini-player and immersive full-screen player
- Voice search: hands-free queries via `expo-speech-recognition`
- Dynamic theming: artwork-driven colors via `react-native-image-colors`
- Fast state and caching: `zustand` + `react-native-mmkv`
- New Architecture (RN 0.81) and Expo Router-based navigation

## Tech Stack

- Expo SDK 54, React Native 0.81, React 19
- TypeScript, Expo Router
- `@saavn-labs/sdk` for JioSaavn data
- `react-native-track-player` for audio playback
- `zustand`, `react-native-mmkv` for state + storage
- `react-native-image-colors` for UI theming
- `react-native-paper` components

## Project Structure

```
app/                 # Expo Router routes
	(tabs)/            # Bottom tab navigator (Home, Search, Library, History)
	album/[id].tsx     # Album details
	artist/[id].tsx    # Artist details
	playlist/[id].tsx  # Playlist details
	_layout.tsx        # Root layout

src/
	components/        # UI components (player, lists, common, search)
	services/          # Data/services (Collection, History, Home, Player, Queue, Search, Storage)
	stores/            # App state (Zustand stores)
	screens/           # Screen containers
	utils/             # Utilities (cache, theming, formatters, errors)
	constants/, types/ # Shared constants and types

android/             # Native Android project
playback-service.js  # Track Player service entrypoint
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or Yarn
- Java JDK + Android SDK (for Android development build)

This project uses native modules (e.g., Track Player, MMKV). Use a development build (dev client). Expo Go will not work.

### Install

```bash
npm install
# or
yarn install
```

### Run (Development Client)

Android (recommended during development):

```bash
# 1) Build & install a dev client on your device/emulator
npm run android

# 2) Start Metro for dev client
npx expo start --dev-client
```

Once Metro is up, open the dev client app and connect to the bundler (QR/code).

### Scripts

- `npm run start`: Start Metro bundler
- `npm run android`: Build and run Android dev client
- `npm run ios`: Build and run iOS dev client (on macOS)
- `npm run lint`: Lint the project

## Configuration

- App metadata and plugins: see app.json
- Icons and splash: assets/images/
- Track Player service: playback-service.js (registered by the app on startup)
- Expo Router routes live under app/

If you add environment variables, type them in expo-env.d.ts and read them via `expo-constants` or your preferred config library.

## Building with EAS

Requires EAS CLI (see eas.json for profiles).

```bash
# Install EAS CLI if needed
npm install -g eas-cli

# Sign in and configure your project
eas login
eas build:configure

# Android builds
eas build -p android --profile development
eas build -p android --profile production
```

Artifacts are available in your Expo account after builds complete.

## Screenshots

| Home                                        | Album                                         | Player                                          |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| ![Home](assets/images/screenshots/home.png) | ![Album](assets/images/screenshots/album.png) | ![Player](assets/images/screenshots/player.png) |

## Troubleshooting

- Using Expo Go: This app uses native modules; use a dev client instead.
- No audio/controls: Ensure the dev client installed successfully and that Android permissions are granted (foreground service, audio settings). Reinstall with `npm run android` if needed.
- Metro cache issues: try `npx expo start -c`.
- Gradle hiccups on Android: Clean/rebuild from Android Studio or remove build caches in android/.

## Contributing

Contributions are welcome! Feel free to:

- Open an issue for bugs/ideas
- Submit a PR with improvements
- Share feedback on UX or performance

## FAQ

- Does this work in Expo Go? No. Use a development build (dev client).
- What powers playback? `react-native-track-player` with a service entrypoint in playback-service.js.
- Where do routes live? Under app/ using Expo Router.

## License

This repository may include a LICENSE file that governs usage. If none is present, assume the code is provided for educational/demonstration purposes; confirm with the repository owner before redistribution.
