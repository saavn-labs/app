import { AlbumScreen } from "@/screens/details";
import { useLocalSearchParams, router } from "expo-router";

export default function AlbumDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <AlbumScreen albumId={id} onBack={() => router.back()} />;
}
