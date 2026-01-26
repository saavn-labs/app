import SearchScreen from "@/screens/Search";
import { router } from "expo-router";

export default function SearchTab() {
  return (
    <SearchScreen
      onAlbumPress={(id) => router.push(`/album/${id}`)}
      onArtistPress={(id) => router.push(`/artist/${id}`)}
      onPlaylistPress={(id) => router.push(`/playlist/${id}`)}
    />
  );
}
