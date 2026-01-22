import AsyncStorage from "@react-native-async-storage/async-storage";
import { Models } from "@saavn-labs/sdk";

const PLAYER_STATE_KEY = "@player_state";

export interface SavedPlayerState {
  currentSong: Models.Song | null;
  seekPosition: number;
  timestamp: string;
}

/**
 * PlayerStateService - Persists and restores player state across app sessions
 * Saves the currently playing song and its seek position
 */
export class PlayerStateService {
  async savePlayerState(
    song: Models.Song | null,
    seekPosition: number = 0,
  ): Promise<void> {
    try {
      const state: SavedPlayerState = {
        currentSong: song,
        seekPosition,
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("❌ Error saving player state:", error);
    }
  }

  async getPlayerState(): Promise<SavedPlayerState | null> {
    try {
      const data = await AsyncStorage.getItem(PLAYER_STATE_KEY);
      const state = data ? JSON.parse(data) : null;

      return state;
    } catch (error) {
      console.error("❌ Error getting player state:", error);
      return null;
    }
  }

  async clearPlayerState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PLAYER_STATE_KEY);
    } catch (error) {
      console.error("Error clearing player state:", error);
    }
  }
}

export const playerStateService = new PlayerStateService();
