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

// Initialize player
initializePlayer();

// Register playback service
TrackPlayer.registerPlaybackService(
  () => require("./playback-service").playbackService,
);

// Export the context object
function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
