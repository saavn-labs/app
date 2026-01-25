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
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    });

    initialized = true;

    console.log("[Init] TrackPlayer initialized");
  } catch (error) {
    console.error("[Init] ❌ Failed to initialize TrackPlayer:", error);
  }
}

initializePlayer();

TrackPlayer.registerPlaybackService(
  () => require("./playback-service").playbackService,
);

export function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
