import SearchScreen from "@/screens/Search";
import { useRouter } from "expo-router";

export default function SearchTab() {
  const router = useRouter();

  return (
    <SearchScreen
      onAlbumPress={(id) => router.push(`/album/${id}`)}
      onArtistPress={(id) => router.push(`/artist/${id}`)}
      onPlaylistPress={(id) => router.push(`/playlist/${id}`)}
    />
  );
}
