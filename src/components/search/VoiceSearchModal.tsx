import { theme } from "@/utils";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Text } from "react-native-paper";

let SpeechModule: any = null;
let useSpeechEvent: any = null;

try {
  const speechRecognition = require("expo-speech-recognition");
  SpeechModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechEvent = speechRecognition.useSpeechRecognitionEvent;
} catch (error) {
  console.warn("expo-speech-recognition not available");
}

interface VoiceSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}

const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  visible,
  onClose,
  onResult,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const recognitionActiveRef = useRef(false);

  useEffect(() => {
    if (!SpeechModule) {
      setIsAvailable(false);
      return;
    }

    try {
      const available = SpeechModule.isRecognitionAvailable();
      setIsAvailable(available);
    } catch (err) {
      setIsAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (visible && isAvailable && !recognitionActiveRef.current) {
      const timer = setTimeout(() => {
        handleMicPress();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [visible, isAvailable]);

  useEffect(() => {
    return () => {
      if (SpeechModule && recognitionActiveRef.current) {
        try {
          SpeechModule.abort();
        } catch (err) {}
      }
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );

      const createWave = (value: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(value, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );

      pulse.start();
      createWave(wave1, 0).start();
      createWave(wave2, 300).start();
      createWave(wave3, 600).start();

      return () => pulse.stop();
    }

    pulseAnim.setValue(1);
    wave1.setValue(0);
    wave2.setValue(0);
    wave3.setValue(0);
  }, [isListening, pulseAnim, wave1, wave2, wave3]);

  useEffect(() => {
    if (!visible) {
      if (recognitionActiveRef.current && SpeechModule) {
        try {
          SpeechModule.abort();
        } catch (err) {}
      }
      setIsListening(false);
      setTranscript("");
      setError(null);
      recognitionActiveRef.current = false;
    }
  }, [visible]);

  if (useSpeechEvent) {
    useSpeechEvent("start", () => {
      recognitionActiveRef.current = true;
      setError(null);
      setIsListening(true);
      setTranscript("");
    });

    useSpeechEvent("end", () => {
      recognitionActiveRef.current = false;
      setIsListening(false);
    });

    useSpeechEvent("error", (event: any) => {
      if (event?.error !== "aborted") {
        setError(event?.message || "Speech recognition error");
      }
      recognitionActiveRef.current = false;
      setIsListening(false);
    });

    useSpeechEvent("result", (event: any) => {
      const text = event?.results?.[0]?.transcript?.trim() || "";
      if (!text) return;

      setTranscript(text);

      if (event.isFinal) {
        onResult(text);
      }
    });
  }

  const handleMicPress = useCallback(async () => {
    if (!SpeechModule) {
      setError("Voice search is not available on this device.");
      return;
    }

    if (recognitionActiveRef.current) {
      try {
        SpeechModule.stop();
      } catch (err) {
        console.error("Stop failed:", err);
      }
      return;
    }

    setError(null);

    if (!isAvailable) {
      setError("Speech recognition not available on this device.");
      return;
    }

    try {
      if (Platform.OS !== "web") {
        const permissions = await SpeechModule.requestPermissionsAsync();

        if (!permissions.granted) {
          setError("Microphone permission is required for voice search.");
          return;
        }
      }

      SpeechModule.start({
        lang: "en-IN",
        interimResults: true,
        continuous: false,
      });
    } catch (err) {
      console.error("Voice search failed:", err);
      setError("Unable to start voice search.");
      setIsListening(false);
    }
  }, [isAvailable]);

  const createWaveStyle = (waveValue: Animated.Value) => ({
    opacity: waveValue.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.4, 0],
    }),
    transform: [
      {
        scale: waveValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.8],
        }),
      },
    ],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>
              Voice Search
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
              iconColor={theme.colors.onSurface}
            />
          </View>

          <View style={styles.voiceContainer}>
            <View style={styles.micContainer}>
              <Animated.View
                style={[
                  styles.wave,
                  { backgroundColor: `${theme.colors.primary}15` },
                  createWaveStyle(wave1),
                ]}
              />
              <Animated.View
                style={[
                  styles.wave,
                  { backgroundColor: `${theme.colors.primary}10` },
                  createWaveStyle(wave2),
                ]}
              />
              <Animated.View
                style={[
                  styles.wave,
                  { backgroundColor: `${theme.colors.primary}08` },
                  createWaveStyle(wave3),
                ]}
              />

              <TouchableOpacity
                style={[
                  styles.micButton,
                  {
                    backgroundColor: isListening
                      ? theme.colors.primary
                      : `${theme.colors.primary}20`,
                  },
                ]}
                onPress={handleMicPress}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <IconButton
                    icon={isListening ? "microphone" : "microphone-outline"}
                    size={40}
                    iconColor={isListening ? "#000" : theme.colors.primary}
                    style={{ margin: 0 }}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>

            {transcript ? (
              <View style={styles.transcriptContainer}>
                <Text variant="titleMedium" style={styles.transcript}>
                  "{transcript}"
                </Text>
              </View>
            ) : (
              <>
                <Text variant="titleMedium" style={styles.statusText}>
                  {isListening ? "Listening..." : "Tap to search with voice"}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.hintText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {error ||
                    (isListening ? "Speak now..." : "Try: Arijit Singh")}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontWeight: "700",
  },
  voiceContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  micContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  wave: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  statusText: {
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  hintText: {
    textAlign: "center",
    opacity: 0.7,
    fontSize: 13,
  },
  transcriptContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    marginTop: 8,
  },
  transcript: {
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default VoiceSearchModal;
