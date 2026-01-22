import LibraryScreen from "@/screens/Library";
import { useRouter } from "expo-router";

export default function LibraryTab() {
  const router = useRouter();

  return (
    <LibraryScreen onPlaylistPress={(id) => router.push(`/playlist/${id}`)} />
  );
}
