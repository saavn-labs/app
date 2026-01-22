import { ArtistScreen } from "@/screens/details";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ArtistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ArtistScreen
      artistId={id}
      onBack={() => router.back()}
      onAlbumPress={(albumId) => router.push(`/album/${albumId}`)}
    />
  );
}
