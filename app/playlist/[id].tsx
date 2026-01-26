import { PlaylistScreen } from "@/screens/details";
import { useLocalSearchParams, router } from "expo-router";

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PlaylistScreen playlistId={id} onBack={() => router.back()} />;
}
