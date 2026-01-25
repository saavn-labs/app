import FullPlayer from "@/components/player/FullPlayer";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

export default function NotificationTab() {
  const router = useRouter();
  const playerVisible = true;

  const handleClose = () => {
    router.push("/");
  };

  return (
    <View style={styles.container}>
      <FullPlayer visible={playerVisible} onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
});
