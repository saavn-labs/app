# Saavn Music

**A modern JioSaavn client built with Expo & React Native**

<p align="center">
  <img src="assets/images/banner.png" alt="Saavn Music banner" />
</p>

Saavn Music is a **full-featured music streaming application** built using **Expo, React Native, and the New Architecture**, powered by **`@saavn-labs/sdk`** and **`react-native-track-player`**.

The app focuses on **performance**, **clean architecture**, and **a polished playback experience**, including background audio, queue management, and rich player UIs.

---

## ✨ Highlights

* 🚀 **Modern stack**: Expo SDK 54, React Native 0.81, React 19
* 🎧 **Robust audio playback** with background support
* 🧠 **Clean state management** using Zustand + MMKV
* 🎨 **Dynamic theming** based on album artwork
* 🗣️ **Voice search** using on-device speech recognition
* 🧩 **Modular architecture** with clear separation of concerns
* 🧪 **Development build workflow** (no Expo Go limitations)

---

## 🧭 Features

### Browsing & Discovery

* Home feed with curated content
* Powerful search for songs, albums, artists, and playlists
* Dedicated Library and History screens

### Playback Experience

* Background audio playback
* Queue management (play next, add to queue)
* Seek, skip, repeat, and media controls
* Mini-player and immersive full-screen player
* Android media notification & lock-screen controls

### UI & UX

* Artwork-driven dynamic colors
* Smooth transitions and responsive layouts
* Snackbar system for global feedback
* Optimized for both phones and tablets

### Performance & Storage

* Fast persistent storage using `react-native-mmkv`
* Efficient caching and minimal re-renders
* Designed around RN New Architecture constraints

---

## 🖼️ Screenshots

| Home                                        | Album                                         | Player                                          |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| ![Home](assets/images/screenshots/home.png) | ![Album](assets/images/screenshots/album.png) | ![Player](assets/images/screenshots/player.png) |

---

## 🛠️ Tech Stack

| Category   | Tech                           |
| ---------- | ------------------------------ |
| Framework  | Expo SDK 54, React Native 0.81 |
| Language   | TypeScript                     |
| Navigation | Expo Router                    |
| Playback   | react-native-track-player      |
| Data       | @saavn-labs/sdk                |
| State      | Zustand                        |
| Storage    | react-native-mmkv              |
| UI         | react-native-paper             |
| Theming    | react-native-image-colors      |

---

## 🗂️ Project Structure

```txt
app/                     # Expo Router routes
  (tabs)/                # Home, Search, Library, History
  album/[id].tsx         # Album detail screen
  artist/[id].tsx        # Artist detail screen
  playlist/[id].tsx      # Playlist detail screen
  _layout.tsx             # Root layout

src/
  components/            # Reusable UI components
  services/              # Domain services (Player, Queue, Search, Storage)
  stores/                # Zustand stores
  screens/               # Screen-level containers
  utils/                 # Helpers (theming, formatting, cache)
  constants/             # Shared constants
  types/                 # Global TypeScript types

android/                 # Native Android project
playback-service.js      # Track Player service entrypoint
```

---

## ⚡ Quick Start

### Prerequisites

* Node.js **18+**
* npm, yarn, or bun
* Java JDK + Android SDK
* Android device or emulator

> ⚠️ **Important**
> This project uses native modules. **Expo Go is not supported**.
> You must use a **development build (dev client)**.

---

### Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

---

### Run on Android (Development Client)

```bash
# Build & install the dev client
npm run android

# Start Metro for the dev client
npx expo start --dev-client
```

Open the installed dev client app and connect to Metro.

---

## 📜 Available Scripts

| Script            | Description                             |
| ----------------- | --------------------------------------- |
| `npm run start`   | Start Metro bundler                     |
| `npm run android` | Build & run Android dev client          |
| `npm run ios`     | Build & run iOS dev client (macOS only) |
| `npm run lint`    | Run ESLint                              |

---

## ⚙️ Configuration

* **App metadata & plugins**: `app.json`
* **Assets**: `assets/images`
* **Playback service**: `playback-service.js`
* **Routes**: `app/` (Expo Router)

Environment variables should be:

* Typed in `expo-env.d.ts`
* Read via `expo-constants` or your config utility

---

## 🚀 Building with EAS

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Build Profiles

```bash
# Development
eas build -p android --profile development

# Production
eas build -p android --profile production
```

Build artifacts will be available in your Expo dashboard.

---

## 🧩 Architecture Notes

* **Playback logic** is isolated in a service layer
* UI reflects **intent**, not raw player state
* Zustand stores are lean and domain-focused
* Native constraints are handled explicitly (Android foreground service, audio focus)

This is not a demo app. It is structured for **long-term maintainability**.

---

## 🧪 Troubleshooting

* **App won’t run in Expo Go**
  → Expected. Use a dev client.

* **No audio / controls missing**
  → Reinstall dev client with `npm run android`

* **Metro issues**

  ```bash
  npx expo start -c
  ```

* **Gradle errors**
  → Clean build or delete `android/.gradle`

---

## 🤝 Contributing

Contributions are welcome.

* Open issues for bugs or ideas
* Submit PRs with improvements
* UX and performance feedback is appreciated

---

## 📄 License