import { GenericMediaItem, TrackItem } from "@/components";
import { AUDIO_QUALITY, COLORS, UI_CONFIG } from "@/constants";
import { useHomeStore } from "@/stores/homeStore";
import { usePlayerStore } from "@/stores/playerStore";
import { getScreenPaddingBottom } from "@/utils/designSystem";
import { Models } from "@saavn-labs/sdk";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
    Animated,
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
  data: Models.Song[] | Models.Album[] | Models.Playlist[];
  type: "albums" | "playlists" | "songs";
}

interface QuickPickItem {
  id: string;
  title: string;
  imageUrl: string;
  type: "album" | "playlist";
}

const LANGUAGES = ["hindi", "english", "punjabi", "tamil", "telugu"];
const SKELETON_QUICK_PICKS = 6;
const SKELETON_HORIZONTAL_ITEMS = 5;
const SKELETON_SONG_ITEMS = 5;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QUICK_PICK_ITEM_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

const SkeletonQuickPick: React.FC = React.memo(() => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.quickPickItem,
        styles.skeletonQuickPick,
        { width: QUICK_PICK_ITEM_WIDTH, opacity: fadeAnim },
      ]}
    >
      <View style={styles.skeletonQuickPickImage} />
      <View style={styles.quickPickMeta}>
        <View style={styles.skeletonQuickPickTitle} />
      </View>
    </Animated.View>
  );
});

const SkeletonHorizontalItem: React.FC = React.memo(() => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: fadeAnim }]}>
      <View style={styles.skeletonCardImage} />
      <View style={styles.skeletonCardTitle} />
      <View style={styles.skeletonCardSubtitle} />
    </Animated.View>
  );
});

const SkeletonSongItem: React.FC = React.memo(() => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.skeletonSongItem, { opacity: fadeAnim }]}>
      <View style={styles.skeletonSongImage} />
      <View style={styles.skeletonSongInfo}>
        <View style={styles.skeletonSongTitle} />
        <View style={styles.skeletonSongArtist} />
      </View>
    </Animated.View>
  );
});

const QuickPickItem: React.FC<{
  item: QuickPickItem;
  onPress: () => void;
}> = React.memo(({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.quickPickItem, { width: QUICK_PICK_ITEM_WIDTH }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Image source={{ uri: item.imageUrl }} style={styles.quickPickImage} />
    <View style={styles.quickPickMeta}>
      <Text
        numberOfLines={2}
        style={styles.quickPickTitle}
        variant="titleSmall"
      >
        {item.title}
      </Text>
    </View>
  </TouchableOpacity>
));

const HomeScreen: React.FC<HomeScreenProps> = ({
  onAlbumPress,
  onPlaylistPress,
  onSearchFocus,
}) => {
  const { playSong, currentSong } = usePlayerStore();
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenPaddingBottom(true, true) + insets.bottom;

  const {
    sections,
    loading,
    selectedLanguage,
    setSelectedLanguage,
    quickPicks,
    settingsModalVisible,
    setSettingsModalVisible,
    contentQuality,
    setContentQuality,
    loadPreferences,
    loadHomeData,
  } = useHomeStore();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    loadPreferences();
    loadHomeData(selectedLanguage);
  }, [loadPreferences, loadHomeData, selectedLanguage]);

  useEffect(() => {
    if (selectedLanguage) {
      loadHomeData(selectedLanguage);
    }
  }, [selectedLanguage, loadHomeData]);

  const handleTrackPress = useCallback(
    (track: Models.Song, allTracks: Models.Song[]) => {
      const index = allTracks.findIndex((t) => t.id === track.id);
      playSong(track, allTracks, index);
    },
    [playSong],
  );

  const handleQuickPickPress = useCallback(
    (item: QuickPickItem) => {
      if (item.type === "album") {
        onAlbumPress(item.id);
      } else {
        onPlaylistPress(item.id);
      }
    },
    [onAlbumPress, onPlaylistPress],
  );

  const handleQualityChange = useCallback(
    async (quality: keyof typeof AUDIO_QUALITY) => {
      await setContentQuality(quality);
    },
    [setContentQuality],
  );

  const renderSkeletonQuickPicks = useCallback(
    () => (
      <View style={styles.quickPicksGrid}>
        {Array.from({ length: UI_CONFIG.SKELETON_QUICK_PICKS }).map(
          (_, index) => (
            <SkeletonQuickPick key={index} />
          ),
        )}
      </View>
    ),
    [],
  );

  const renderSkeletonHorizontalList = useCallback(
    () => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {Array.from({ length: UI_CONFIG.SKELETON_HORIZONTAL_ITEMS }).map(
          (_, index) => (
            <SkeletonHorizontalItem key={index} />
          ),
        )}
      </ScrollView>
    ),
    [],
  );

  const renderSkeletonSongList = useCallback(
    () => (
      <View style={styles.skeletonSongList}>
        {Array.from({ length: UI_CONFIG.SKELETON_SONG_ITEMS }).map(
          (_, index) => (
            <SkeletonSongItem key={index} />
          ),
        )}
      </View>
    ),
    [],
  );

  const renderQuickPicks = useCallback(() => {
    if (loading) return renderSkeletonQuickPicks();
    if (quickPicks.length === 0) return null;

    return (
      <View style={styles.quickPicksGrid}>
        {quickPicks.map((item) => (
          <QuickPickItem
            key={item.id}
            item={item}
            onPress={() => handleQuickPickPress(item)}
          />
        ))}
      </View>
    );
  }, [loading, quickPicks, handleQuickPickPress, renderSkeletonQuickPicks]);

  const renderSongsList = useCallback(
    (songs: Models.Song[]) => (
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrackItem
            track={item}
            onPress={() => handleTrackPress(item, songs)}
            isActive={currentSong?.id === item.id}
          />
        )}
        scrollEnabled={false}
      />
    ),
    [currentSong, handleTrackPress],
  );

  const renderAlbumsList = useCallback(
    (albums: Models.Album[]) => (
      <FlatList
        data={albums}
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
    ),
    [onAlbumPress],
  );

  const renderPlaylistsList = useCallback(
    (playlists: Models.Playlist[]) => (
      <FlatList
        data={playlists}
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
    ),
    [onPlaylistPress],
  );

  const renderSection = useCallback(
    (section: Section) => {
      switch (section.type) {
        case "songs":
          return renderSongsList(section.data as Models.Song[]);
        case "albums":
          return renderAlbumsList(section.data as Models.Album[]);
        case "playlists":
          return renderPlaylistsList(section.data as Models.Playlist[]);
        default:
          return null;
      }
    },
    [renderSongsList, renderAlbumsList, renderPlaylistsList],
  );

  const renderLanguageChips = useMemo(
    () => (
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
    ),
    [selectedLanguage],
  );

  const renderSkeletonSections = useCallback(
    () => (
      <>
        <View style={styles.section}>
          <View style={styles.skeletonSectionTitle} />
          {renderSkeletonSongList()}
        </View>

        <View style={styles.section}>
          <View style={styles.skeletonSectionTitle} />
          {renderSkeletonHorizontalList()}
        </View>

        <View style={styles.section}>
          <View style={styles.skeletonSectionTitle} />
          {renderSkeletonHorizontalList()}
        </View>
      </>
    ),
    [renderSkeletonSongList, renderSkeletonHorizontalList],
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={["#1db954", "#121212"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTop}>
            <Text variant="headlineMedium" style={styles.greeting}>
              {greeting}
            </Text>
            <IconButton
              icon="cog"
              iconColor="#fff"
              size={24}
              onPress={() => setSettingsModalVisible(true)}
              style={styles.settingsButton}
            />
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

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
      >
        {renderLanguageChips}

        <View style={styles.section}>{renderQuickPicks()}</View>

        {loading
          ? renderSkeletonSections()
          : sections.map((section, index) => (
              <View key={`${section.title}-${index}`} style={styles.section}>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  {section.title}
                </Text>
                {renderSection(section)}
              </View>
            ))}
      </ScrollView>

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
              Audio Quality
            </Text>

            <RadioButton.Group
              onValueChange={(value) =>
                handleQualityChange(value as keyof typeof AUDIO_QUALITY)
              }
              value={contentQuality}
            >
              <View style={styles.radioOption}>
                <RadioButton.Android value="LOW" color={COLORS.PRIMARY} />
                <Text style={styles.radioLabel}>Low - Save data</Text>
              </View>

              <View style={styles.radioOption}>
                <RadioButton.Android value="MEDIUM" color={COLORS.PRIMARY} />
                <Text style={styles.radioLabel}>Medium - Balanced</Text>
              </View>

              <View style={styles.radioOption}>
                <RadioButton.Android value="HIGH" color={COLORS.PRIMARY} />
                <Text style={styles.radioLabel}>High - Best quality</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingBottom: 8,
  },
  header: {
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
  settingsButton: {
    margin: 0,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 6,
    height: 48,
    paddingRight: 14,
    paddingLeft: 4,
  },
  searchButtonText: {
    color: "#121212",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: -4,
  },
  languageChipsContainer: {
    marginBottom: 16,
  },
  languageChips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
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
  section: {
    marginBottom: 32,
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
  quickPicksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  quickPickItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#282828",
    borderRadius: 6,
    overflow: "hidden",
    height: 60,
    marginBottom: 8,
  },
  quickPickImage: {
    width: 60,
    height: 60,
  },
  quickPickMeta: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 12,
  },
  quickPickTitle: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  skeletonQuickPick: {
    backgroundColor: "#282828",
  },
  skeletonQuickPickImage: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonQuickPickTitle: {
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    width: "80%",
  },
  skeletonCard: {
    width: 140,
    marginRight: 12,
  },
  skeletonCardImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
  },
  skeletonCardTitle: {
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 8,
    width: "90%",
  },
  skeletonCardSubtitle: {
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    width: "70%",
  },
  skeletonSongList: {
    paddingHorizontal: 16,
  },
  skeletonSongItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  skeletonSongImage: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 12,
  },
  skeletonSongInfo: {
    flex: 1,
  },
  skeletonSongTitle: {
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 8,
    width: "70%",
  },
  skeletonSongArtist: {
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    width: "50%",
  },
  skeletonSectionTitle: {
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 16,
    marginHorizontal: 16,
    width: 160,
  },
  modalContainer: {
    backgroundColor: "#282828",
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 12,
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
    fontSize: 15,
    marginLeft: 8,
  },
  modalCloseButton: {
    backgroundColor: "#1db954",
    paddingVertical: 14,
    borderRadius: 25,
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
