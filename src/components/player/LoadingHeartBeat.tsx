import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

const LoadingHeartbeat: React.FC<{ color: string; size?: number }> = ({
  color = "#ffffff",
  size = 28,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={{ opacity: pulseAnim }}>
      <MaterialIcons name="play-arrow" size={size} color={color} />
    </Animated.View>
  );
};

export default LoadingHeartbeat;
