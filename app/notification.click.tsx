import { useCurrentSong } from "@/stores/playerStore";
import { router } from "expo-router";
import { useEffect } from "react";

export default function NotificationClick() {
  const currentSong = useCurrentSong();

  useEffect(() => {
    if (currentSong?.id) {
      router.replace("/(tabs)?showPlayer=true");
    } else {
      router.replace("/(tabs)");
    }
  }, [currentSong]);

  return null;
}
