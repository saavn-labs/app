import { usePlayerStore } from "@/stores/playerStore";
import { Song } from "@saavn-labs/sdk";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playSong = usePlayerStore((state) => state.playSong);

  useEffect(() => {
    const loadAndPlaySong = async () => {
      if (!id) {
        router.replace("/(tabs)");
        return;
      }

      try {
        const result = await Song.getById({ songIds: id });
        const song = result.songs?.[0];

        if (!song) {
          router.replace("/(tabs)");
          return;
        }

        await playSong(song);
        router.replace("/(tabs)?showPlayer=true");
      } catch (error) {
        console.error("[SongScreen] Failed to load song:", error);
        router.replace("/(tabs)");
      }
    };

    void loadAndPlaySong();
  }, [id, playSong]);

  return null;
}
