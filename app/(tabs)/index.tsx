import HomeScreen from "@/screens/Home";
import { router } from "expo-router";

export default function HomeTab() {
  return (
    <HomeScreen
      onAlbumPress={(id) => router.push(`/album/${id}`)}
      onPlaylistPress={(id) => router.push(`/playlist/${id}`)}
      onSearchFocus={() => router.push("/search")}
    />
  );
}
