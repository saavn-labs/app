import HomeScreen from "@/screens/Home";
import { useUIStore } from "@/stores/uiStore";
import { router, useLocalSearchParams } from "expo-router";

export default function HomeTab() {
  const { showPlayer } = useLocalSearchParams<{ showPlayer?: string }>();
  const isFullPlayerVisible = useUIStore((state) => state.isFullPlayerVisible);

  const shouldDeferLoad = showPlayer === "true" || isFullPlayerVisible;

  return (
    <HomeScreen
      onAlbumPress={(id) => router.push(`/album/${id}`)}
      onPlaylistPress={(id) => router.push(`/playlist/${id}`)}
      onSearchFocus={() => router.push("/search")}
      deferInitialLoad={shouldDeferLoad}
    />
  );
}
