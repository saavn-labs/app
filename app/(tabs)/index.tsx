import HomeScreen from "@/screens/Home";
import { useRouter } from "expo-router";

export default function HomeTab() {
  const router = useRouter();

  return (
    <HomeScreen
      onAlbumPress={(id) => router.push(`/album/${id}`)}
      onPlaylistPress={(id) => router.push(`/playlist/${id}`)}
      onSearchFocus={() => router.push("/search")}
    />
  );
}
