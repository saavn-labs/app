import { AlbumScreen } from "@/screens/details";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function AlbumDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return <AlbumScreen albumId={id} onBack={() => router.back()} />;
}
