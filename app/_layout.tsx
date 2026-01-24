import { initializeAudioMode, playerService } from "@/services/PlayerService";
import { useAudioPlayer } from "expo-audio";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { setStatusBarBackgroundColor, StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
} from "react-native";
import {
  configureFonts,
  MD3DarkTheme,
  PaperProvider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

void SplashScreen.preventAutoHideAsync();

const fonts = configureFonts({
  config: {
    fontFamily: "SpotifyMedium",
  },
});

const theme = {
  ...MD3DarkTheme,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#1DB954",
    secondary: "#1ed760",
    background: "#121212",
    surface: "#282828",
    surfaceVariant: "#333333",
    onSurface: "#ffffff",
    onSurfaceVariant: "#b3b3b3",
    error: "#cf6679",
    onError: "#000000",
    outline: "#404040",
  },
  roundness: 12,
};

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    SpotifyMedium: require("../assets/fonts/SpotifyMedium.ttf"),
  });

  const audioPlayer = useAudioPlayer({
    headers: {
      "Accept-Ranges": "bytes",
      Range: "bytes=0-",
    },
  });

  useEffect(() => {
    if (fontsLoaded) {
      const text = RNText as typeof RNText & {
        defaultProps?: { style?: unknown };
      };
      text.defaultProps = {
        ...text.defaultProps,
        style: [text.defaultProps?.style, { fontFamily: "SpotifyMedium" }],
      };

      const textInput = RNTextInput as typeof RNTextInput & {
        defaultProps?: { style?: unknown };
      };
      textInput.defaultProps = {
        ...textInput.defaultProps,
        style: [textInput.defaultProps?.style, { fontFamily: "SpotifyMedium" }],
      };
    }
  }, [fontsLoaded]);

  useEffect(() => {
    setStatusBarBackgroundColor("#121212", false);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    console.log("[Layout] Initializing player...");
    try {
      console.log("[Layout] Setting audio player instance on playerService");
      playerService.setAudioPlayer(audioPlayer);
      console.log("[Layout] Audio player instance set successfully");

      initializeAudioMode();
      console.log("[Layout] Player initialization completed");
    } catch (error) {
      console.error("[Layout] Failed to initialize player:", error);
    }
  }, [audioPlayer]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar backgroundColor="#121212" style="dark" />
      <SafeAreaView
        style={styles.root}
        edges={["top", "bottom", "left", "right"]}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: styles.screenStyle,
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: styles.screenStyle,
            }}
          />
          <Stack.Screen
            name="album/[id]"
            options={{
              presentation: "modal",
              headerShown: false,
              contentStyle: styles.screenStyle,
            }}
          />
          <Stack.Screen
            name="artist/[id]"
            options={{
              presentation: "modal",
              headerShown: false,
              contentStyle: styles.screenStyle,
            }}
          />
          <Stack.Screen
            name="playlist/[id]"
            options={{
              presentation: "modal",
              headerShown: false,
              contentStyle: styles.screenStyle,
            }}
          />
        </Stack>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#121212",
  },
  screenStyle: {
    backgroundColor: "#121212",
  },
});
