import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import TrackPlayer, {
    AndroidAudioContentType,
    AppKilledPlaybackBehavior,
    Capability,
} from "react-native-track-player";

let playerInitialized = false;
let playerInitPromise = null;

function initializePlayer() {
  if (playerInitPromise) return playerInitPromise;

  playerInitPromise = (async () => {
    if (playerInitialized) return;

    try {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
        androidAudioContentType: AndroidAudioContentType.Music,
      });

      await TrackPlayer.updateOptions({
        progressUpdateEventInterval: 1,
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          alwaysPauseOnInterruption: true,
          androidSkipSilence: true,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
      });

      playerInitialized = true;
      console.log("Player initialized successfully");
    } catch (error) {
      console.error("Failed to initialize player:", error);
      throw error;
    }
  })();

  return playerInitPromise;
}

const linking = {
  prefixes: [
    "sausico://",
    "https://sausico.pages.dev",
    "https://*.sausico.pages.dev",
  ],
  config: {
    screens: {
      "(tabs)": {
        screens: {
          index: "",
          search: "search",
          library: "library",
          downloads: "downloads",
        },
      },
      "song/[id]": "song/:id",
      "album/[id]": "album/:id",
      "artist/[id]": "artist/:id",
      "playlist/[id]": "playlist/:id",
      history: "history",
    },
  },
};

// Register playback service immediately (before setupPlayer)
TrackPlayer.registerPlaybackService(
  () => require("./playback-service").playbackService,
);

// Initialize player before mounting the app
(async () => {
  await initializePlayer();

  function App() {
    const ctx = require.context("./app");
    return <ExpoRoot context={ctx} linking={linking} />;
  }

  registerRootComponent(App);
})();
