import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import TrackPlayer, {
    AndroidAudioContentType,
    AppKilledPlaybackBehavior,
    Capability,
} from "react-native-track-player";

let initialized = false;

async function initializePlayer() {
  if (initialized) return;

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

    initialized = true;
  } catch (error) {
    console.error("Failed to initialize player:", error);
  }
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

initializePlayer();

TrackPlayer.registerPlaybackService(
  () => require("./playback-service").playbackService,
);

function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} linking={linking} />;
}

registerRootComponent(App);
