import { AudioPlayer, setAudioModeAsync } from "expo-audio";

export class AudioService {
  private player: AudioPlayer | null = null;
  private currentSource: string = "";
  private isReleased: boolean = false;
  private audioModeConfigured: boolean = false;

  async setPlayer(player: AudioPlayer) {
    this.player = player;
    this.isReleased = false;
    await this.configureAudioMode();
  }

  private async configureAudioMode() {
    if (this.audioModeConfigured) return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });
      this.audioModeConfigured = true;
    } catch (error) {
      console.error("Error configuring audio mode:", error);
    }
  }

  private isPlayerValid(): boolean {
    return this.player !== null && !this.isReleased;
  }

  async loadAndPlayWithPreload(url: string, songId?: string): Promise<void> {
    const player = this.player;
    if (!player || this.isReleased) return;

    try {
      const id = songId || url.split("/").pop() || url;

      if (this.currentSource !== url) {
        await player.replace(url);
        this.currentSource = url;
      }

      await player.play();
    } catch (error) {
      console.error("Error loading audio:", error);
      this.isReleased = true;
      this.player = null;
      throw error;
    }
  }

  async loadAndPlay(url: string): Promise<void> {
    await this.loadAndPlayWithPreload(url);
  }

  async play(): Promise<void> {
    const player = this.player;
    if (!player || this.isReleased) return;
    try {
      await player.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      this.isReleased = true;
      this.player = null;
      throw error;
    }
  }

  async pause(): Promise<void> {
    const player = this.player;
    if (!player || this.isReleased) return;
    try {
      await player.pause();
    } catch (error) {
      console.error("Error pausing audio:", error);
      this.isReleased = true;
      this.player = null;
      throw error;
    }
  }

  async seekTo(position: number): Promise<void> {
    const player = this.player;
    if (!player || this.isReleased) return;
    try {
      await player.seekTo(position);
    } catch (error) {
      console.error("Error seeking to position:", error);
      this.isReleased = true;
      this.player = null;
      throw error;
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) return;
    try {
      this.player.volume = Math.max(0, Math.min(1, volume));
    } catch (error) {
      console.error("Error setting volume:", error);
      throw error;
    }
  }

  getCurrentTime(): number {
    try {
      if (!this.isPlayerValid()) {
        return 0;
      }
      return this.player?.currentTime || 0;
    } catch (error) {
      this.isReleased = true;
      return 0;
    }
  }

  getDuration(): number {
    try {
      if (!this.isPlayerValid()) {
        return 0;
      }
      return this.player?.duration || 0;
    } catch (error) {
      this.isReleased = true;
      return 0;
    }
  }

  isPlaying(): boolean {
    try {
      if (!this.isPlayerValid()) {
        return false;
      }
      return this.player?.playing || false;
    } catch (error) {
      // Mark player as released if we get an error accessing it
      this.isReleased = true;
      return false;
    }
  }

  async release(): Promise<void> {
    this.currentSource = "";
    this.isReleased = true;
    this.player = null;
  }
}

export const audioService = new AudioService();
