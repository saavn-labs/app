import AlbumItem from "@/components/items/AlbumItem";
import PlaylistItem from "@/components/items/PlaylistItem";
import TrackItem from "@/components/items/TrackItem";
import { usePlayer } from "@/contexts/PlayerContext";
import { getScreenPaddingBottom } from "@/utils/designSystem";
import { Album, Models, Playlist, Song } from "@saavn-labs/sdk";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Chip, IconButton, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HomeScreenProps {
  onAlbumPress: (albumId: string) => void;
  onPlaylistPress: (playlistId: string) => void;
  onSearchFocus: () => void;
}

interface Section {
  title: string;
  data: any[];
  type: "albums" | "playlists" | "songs";
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onAlbumPress,
  onPlaylistPress,
  onSearchFocus,
}) => {
  const router = useRouter();
  const { playSong, currentSong } = usePlayer();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("hindi");
  const [greeting, setGreeting] = useState("");
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);

  const languages = ["hindi", "english", "punjabi", "tamil", "telugu"];
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [selectedLanguage]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const loadHomeData = async () => {
    try {
      setLoading(true);

      const [trendingAlbums, trendingPlaylists, trendingSongs] =
        await Promise.all([
          Album.getTrending({ language: selectedLanguage }),
          Playlist.getTrending({ language: selectedLanguage }),
          Song.getTrending({ language: selectedLanguage }),
        ]);

      const mockRecentlyPlayed = [
        ...trendingAlbums.slice(0, 3),
        ...trendingPlaylists.slice(0, 3),
      ].slice(0, 6);
      setRecentlyPlayed(mockRecentlyPlayed);

      const newSections: Section[] = [];

      if (trendingSongs.length > 0) {
        newSections.push({
          title: "Trending Songs",
          data: trendingSongs.slice(0, 10),
          type: "songs",
        });
      }

      if (trendingAlbums.length > 0) {
        newSections.push({
          title: "Trending Albums",
          data: trendingAlbums.slice(0, 10),
          type: "albums",
        });
      }

      if (trendingPlaylists.length > 0) {
        newSections.push({
          title: "Featured Playlists",
          data: trendingPlaylists.slice(0, 10),
          type: "playlists",
        });
      }

      setSections(newSections);
    } catch (error) {
      console.error("Error loading home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = (track: Models.Song, allTracks: Models.Song[]) => {
    const index = allTracks.findIndex((t) => t.id === track.id);
    playSong(track, allTracks, index);
  };

  const renderHorizontalList = (section: Section) => {
    if (section.type === "albums") {
      return (
        <FlatList
          data={section.data}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <AlbumItem
              album={item}
              onPress={() => onAlbumPress(item.id)}
              horizontal
            />
          )}
          keyExtractor={(item) => item.id}
        />
      );
    }

    if (section.type === "playlists") {
      return (
        <FlatList
          data={section.data}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <PlaylistItem
              playlist={item}
              onPress={() => onPlaylistPress(item.id)}
              horizontal
            />
          )}
          keyExtractor={(item) => item.id}
        />
      );
    }

    if (section.type === "songs") {
      return (
        <View>
          {section.data.slice(0, 5).map((track) => (
            <TrackItem
              key={track.id}
              track={track}
              onPress={() => handleTrackPress(track, section.data)}
              isActive={currentSong?.id === track.id}
              onMenuAction={() => {}}
            />
          ))}
        </View>
      );
    }

    return null;
  };

  const renderRecentlyPlayedGrid = () => {
    if (recentlyPlayed.length === 0) return null;

    const itemWidth = (width - 32 - 12) / 2;

    return (
      <View style={styles.recentlyPlayedGrid}>
        {recentlyPlayed.slice(0, 6).map((item, index) => (
          <TouchableOpacity
            key={`${item.id}-${index}`}
            style={[styles.recentlyPlayedItem, { width: itemWidth }]}
            onPress={() => {
              if (item.type === "album" || item.images) {
                onAlbumPress(item.id);
              } else {
                onPlaylistPress(item.id);
              }
            }}
            activeOpacity={0.75}
          >
            <Image
              source={{ uri: item.images?.[1]?.url || item.images?.[0]?.url }}
              style={styles.recentlyPlayedImage}
            />
            <View style={styles.recentlyPlayedMeta}>
              <Text
                numberOfLines={2}
                style={styles.recentlyPlayedTitle}
                variant="titleSmall"
              >
                {item.title || item.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const onHistoryPress = () => {
    router.push("/history");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Fixed Header with gradient */}
      <LinearGradient
        colors={["#1db954", "#121212"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text variant="headlineMedium" style={styles.greeting}>
              {greeting}
            </Text>
            <View style={styles.headerIcons}>
              <IconButton
                icon="history"
                iconColor="#fff"
                size={24}
                onPress={onHistoryPress}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.searchButton}
            onPress={onSearchFocus}
          >
            <IconButton icon="magnify" size={22} iconColor="#b3b3b3" />
            <Text style={styles.searchButtonText} variant="bodyMedium">
              What do you want to listen to?
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Scrollable Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1db954" />
            </View>
          ) : (
            <>
              {/* Language Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.languageChips}
                style={styles.languageChipsContainer}
              >
                {languages.map((lang) => (
                  <Chip
                    key={lang}
                    onPress={() => setSelectedLanguage(lang)}
                    style={[
                      styles.chip,
                      selectedLanguage === lang && styles.chipSelected,
                    ]}
                    textStyle={[
                      styles.chipText,
                      selectedLanguage === lang && styles.chipTextSelected,
                    ]}
                    selectedColor="#000"
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </Chip>
                ))}
              </ScrollView>

              {/* Recently Played */}
              {recentlyPlayed.length > 0 && (
                <View style={styles.section}>{renderRecentlyPlayedGrid()}</View>
              )}

              {/* Made for you sections */}
              {sections.map((section, index) => (
                <View key={`${section.title}-${index}`} style={styles.section}>
                  <Text variant="titleLarge" style={styles.sectionTitle}>
                    {section.title}
                  </Text>
                  {renderHorizontalList(section)}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#121212",
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingBottom: 8,
  },
  header: {
    paddingTop: 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 28,
  },
  headerIcons: {
    flexDirection: "row",
    marginRight: -8,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    borderRadius: 24,
    height: 46,
    paddingRight: 14,
    paddingLeft: 4,
    borderWidth: 1,
    borderColor: "#2b2b2b",
  },
  searchButtonText: {
    color: "#b3b3b3",
    fontSize: 14,
    marginLeft: -4,
  },
  languageChipsContainer: {
    marginBottom: 16,
    marginHorizontal: 0,
  },
  languageChips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  chip: {
    backgroundColor: "#282828",
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: "#1db954",
  },
  chipText: {
    fontSize: 13,
    color: "#b3b3b3",
  },
  chipTextSelected: {
    color: "#000",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 22,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  recentlyPlayedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  recentlyPlayedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    borderRadius: 10,
    overflow: "hidden",
    paddingRight: 12,
    height: 60,
    marginBottom: 8,
  },
  recentlyPlayedImage: {
    width: 60,
    height: 60,
  },
  recentlyPlayedMeta: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 4,
  },
  recentlyPlayedTitle: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  bottomPadding: {
    backgroundColor: "transparent",
  },
});

export default HomeScreen;
