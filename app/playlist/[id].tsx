import { PlaylistScreen } from "@/screens/details";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return <PlaylistScreen playlistId={id} onBack={() => router.back()} />;
}
