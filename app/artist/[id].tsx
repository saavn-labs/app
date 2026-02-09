import { ArtistScreen } from "@/screens/details";
import { useLocalSearchParams, router } from "expo-router";

export default function ArtistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ArtistScreen
      artistId={id}
      onAlbumPress={(albumId) => router.push(`/album/${albumId}`)}
    />
  );
}
