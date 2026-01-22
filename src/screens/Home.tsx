import { GenericMediaItem, TrackItem } from "@/components";
import { AUDIO_QUALITY, COLORS } from "@/constants";
import { usePlayer } from "@/contexts/PlayerContext";
import { storageService } from "@/services/StorageService";
import { getScreenPaddingBottom } from "@/utils/designSystem";
import { handleAsync, logError } from "@/utils/errorHandler";
import { Album, Models, Playlist, Song } from "@saavn-labs/sdk";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Chip,
  IconButton,
  Modal,
  Portal,
  RadioButton,
  Text,
} from "react-native-paper";
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

const LANGUAGES = ["hindi", "english", "punjabi", "tamil", "telugu"];
const TRENDING_LIMIT = 10;
const RECENTLY_PLAYED_LIMIT = 6;

const HomeScreen: React.FC<HomeScreenProps> = ({
  onAlbumPress,
  onPlaylistPress,
  onSearchFocus,
}) => {
  const { playSong, currentSong } = usePlayer();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("hindi");
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [contentQuality, setContentQuality] =
    useState<keyof typeof AUDIO_QUALITY>("MEDIUM");

  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [selectedLanguage]);

  const loadUserPreferences = useCallback(async () => {
    const result = await handleAsync(async () => {
      const quality = await storageService.getContentQuality();
      return quality;
    }, "Failed to load user preferences");

    if (result.success && result.data) {
      setContentQuality(result.data as keyof typeof AUDIO_QUALITY);
    }
  }, []);

  const loadHomeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await handleAsync(async () => {
      const [trendingAlbums, trendingPlaylists, trendingSongs] =
        await Promise.all([
          Album.getTrending({ language: selectedLanguage }),
          Playlist.getTrending({ language: selectedLanguage }),
          Song.getTrending({ language: selectedLanguage }),
        ]);

      return { trendingAlbums, trendingPlaylists, trendingSongs };
    }, "Failed to load home data");

    if (result.success && result.data) {
      const { trendingAlbums, trendingPlaylists, trendingSongs } = result.data;

      // Build recently played from trending items
      const mockRecentlyPlayed = [
        ...trendingAlbums.slice(0, 3),
        ...trendingPlaylists.slice(0, 3),
      ].slice(0, RECENTLY_PLAYED_LIMIT);
      setRecentlyPlayed(mockRecentlyPlayed);

      // Build sections
      const newSections: Section[] = [];

      if (trendingSongs.length > 0) {
        newSections.push({
          title: "Trending Songs",
          data: trendingSongs.slice(0, TRENDING_LIMIT),
          type: "songs",
        });
      }

      if (trendingAlbums.length > 0) {
        newSections.push({
          title: "Trending Albums",
          data: trendingAlbums.slice(0, TRENDING_LIMIT),
          type: "albums",
        });
      }

      if (trendingPlaylists.length > 0) {
        newSections.push({
          title: "Featured Playlists",
          data: trendingPlaylists.slice(0, TRENDING_LIMIT),
          type: "playlists",
        });
      }

      setSections(newSections);
    } else {
      setError(result.error || "Failed to load home data");
      logError("HomeScreen.loadHomeData", result.error);
    }

    setLoading(false);
  }, [selectedLanguage]);

  const handleTrackPress = useCallback(
    (track: Models.Song, allTracks: Models.Song[]) => {
      const index = allTracks.findIndex((t) => t.id === track.id);
      playSong(track, allTracks, index);
    },
    [playSong],
  );

  const renderHorizontalList = (section: Section) => {
    if (section.type === "albums") {
      return (
        <FlatList
          data={section.data}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <GenericMediaItem
              data={item}
              type="album"
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
            <GenericMediaItem
              data={item}
              type="playlist"
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

  const onSettingsPress = () => {
    setSettingsModalVisible(true);
  };

  const handleQualityChange = useCallback(
    async (quality: keyof typeof AUDIO_QUALITY) => {
      setContentQuality(quality);

      const result = await handleAsync(
        async () => await storageService.saveContentQuality(quality),
        "Failed to save content quality",
      );

      if (!result.success) {
        logError("HomeScreen.handleQualityChange", result.error);
      }
    },
    [],
  );

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
                icon="cog"
                iconColor="#fff"
                size={24}
                onPress={onSettingsPress}
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
                {LANGUAGES.map((lang) => (
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

              {recentlyPlayed.length > 0 && (
                <View style={styles.section}>{renderRecentlyPlayedGrid()}</View>
              )}

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

      {/* Settings Modal */}
      <Portal>
        <Modal
          visible={settingsModalVisible}
          onDismiss={() => setSettingsModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Settings
          </Text>

          <View style={styles.settingSection}>
            <Text variant="titleMedium" style={styles.settingLabel}>
              Content Quality
            </Text>

            <RadioButton.Group
              onValueChange={(value) =>
                handleQualityChange(value as keyof typeof AUDIO_QUALITY)
              }
              value={contentQuality}
            >
              <View style={styles.radioOption}>
                <RadioButton.Android value="LOW" color={COLORS.PRIMARY} />
                <Text style={styles.radioLabel}>Low</Text>
              </View>

              <View style={styles.radioOption}>
                <RadioButton.Android value="MEDIUM" color={COLORS.PRIMARY} />
                <Text style={styles.radioLabel}>Medium</Text>
              </View>

              <View style={styles.radioOption}>
                <RadioButton.Android value="HIGH" color={COLORS.PRIMARY} />
                <Text style={styles.radioLabel}>High</Text>
              </View>
            </RadioButton.Group>
          </View>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSettingsModalVisible(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
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
  modalContainer: {
    backgroundColor: "#282828",
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 24,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingLabel: {
    color: "#fff",
    marginBottom: 16,
    fontWeight: "600",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  radioLabel: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
  },
  modalCloseButton: {
    backgroundColor: "#1db954",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomeScreen;
