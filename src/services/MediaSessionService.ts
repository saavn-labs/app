import { Models } from "@saavn-labs/sdk";

let MediaControl: any;
let PlaybackState: any;
let Command: any;

try {
  const MediaControlModule = require("expo-media-control");
  MediaControl = MediaControlModule.MediaControl;
  PlaybackState = MediaControlModule.PlaybackState;
  Command = MediaControlModule.Command;
} catch (e) {
  MediaControl = {
    enableMediaControls: async () => {},
    updateMetadata: async () => {},
    updatePlaybackState: async () => {},
    disableMediaControls: async () => {},
    getCurrentState: async () => 0,
    addListener: () => () => {},
  };
  PlaybackState = { PLAYING: 2, PAUSED: 3, STOPPED: 1, NONE: 0 };
  Command = {
    PLAY: "play",
    PAUSE: "pause",
    STOP: "stop",
    NEXT_TRACK: "nextTrack",
    PREVIOUS_TRACK: "previousTrack",
    SKIP_FORWARD: "skipForward",
    SKIP_BACKWARD: "skipBackward",
    SEEK: "seek",
  };
}

interface MediaControlEvent {
  command: string;
  data?: {
    position?: number;
    interval?: number;
  };
}

export interface RemoteCommandHandlers {
  onPlay?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onPlayPause?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  onPrevious?: () => void | Promise<void>;
  onSeek?: (position: number) => void | Promise<void>;
}

interface MediaMetadata {
  title: string;
  artist: string;
  subtitle?: string;
  album?: string;
  position: number;
  duration: number;
  artwork?: string;
}

export class MediaSessionService {
  private isInitialized = false;
  private commandHandlers: RemoteCommandHandlers = {};
  private unsubscribe: (() => void) | null = null;
  private currentMetadata: MediaMetadata | null = null;

  async initialize(handlers?: RemoteCommandHandlers) {
    try {
      if (this.isInitialized) {
        return;
      }

      if (handlers) {
        this.commandHandlers = handlers;
      }

      await MediaControl.enableMediaControls({
        capabilities: [
          Command.PLAY,
          Command.PAUSE,
          Command.NEXT_TRACK,
          Command.PREVIOUS_TRACK,
          Command.SEEK,
          Command.SKIP_FORWARD,
          Command.SKIP_BACKWARD,
        ],
        notification: {
          color: "#1DB954",
          showWhenClosed: true,
          ongoing: false,
        },
        android: {
          skipInterval: 15,
          useChapter: false,
        },
      });

      this.unsubscribe = MediaControl.addListener(
        async (event: MediaControlEvent) => {
          try {
            await this.handleMediaControlEvent(event);
          } catch (error) {
            console.error("Error handling media control event:", error);
          }
        },
      );

      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing media session:", error);
    }
  }

  private async handleMediaControlEvent(event: MediaControlEvent) {
    const { command, data } = event;

    try {
      switch (command) {
        case Command.PLAY:
          await this.commandHandlers.onPlay?.();
          break;

        case Command.PAUSE:
          await this.commandHandlers.onPause?.();
          break;

        case Command.NEXT_TRACK:
          await this.commandHandlers.onNext?.();
          break;

        case Command.PREVIOUS_TRACK:
          await this.commandHandlers.onPrevious?.();
          break;

        case Command.SEEK:
          if (data?.position !== undefined) {
            await this.commandHandlers.onSeek?.(data.position);
          }
          break;

        case Command.SKIP_FORWARD:
          if (data?.interval && this.commandHandlers.onSeek) {
            const newPosition =
              (this.currentMetadata?.position || 0) + data.interval;
            await this.commandHandlers.onSeek(newPosition);
          }
          break;

        case Command.SKIP_BACKWARD:
          if (data?.interval && this.commandHandlers.onSeek) {
            const newPosition = Math.max(
              0,
              (this.currentMetadata?.position || 0) - data.interval,
            );
            await this.commandHandlers.onSeek(newPosition);
          }
          break;
      }
    } catch (error) {
      console.error("Error processing media control event:", error);
    }
  }

  async updateNowPlaying(
    song: Models.Song,
    streamUrl: string = "",
    isPlaying: boolean = false,
    position: number = 0,
    duration: number = 0,
  ) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const artistNames =
        song.artists?.primary?.map((a) => a.name).join(", ") ||
        "Unknown Artist";

      const albumName =
        typeof song.album === "string" ? song.album : song.album?.title || "";

      const subtitle = song.subtitle
        ? song.subtitle
        : albumName
          ? `${artistNames} • ${albumName}`
          : artistNames;

      const artwork = song.images?.[2]?.url || song.images?.[0]?.url || "";

      this.currentMetadata = {
        title: song.title || "Unknown",
        artist: artistNames,
        album: albumName,
        artwork,
        position,
        duration,
      };

      await MediaControl.updateMetadata({
        title: song.title || "Unknown",
        artist: artistNames,
        album: albumName || "Unknown Album",
        subtitle,
        artwork: artwork
          ? {
              uri: artwork,
            }
          : undefined,
        duration,
      });

      const state = isPlaying ? PlaybackState.PLAYING : PlaybackState.PAUSED;
      await MediaControl.updatePlaybackState(state, position, 1.0);
    } catch (error) {
      console.error("Error updating now playing:", error);
    }
  }

  async updatePlaybackState(isPlaying: boolean, position: number = 0) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const state = isPlaying ? PlaybackState.PLAYING : PlaybackState.PAUSED;
      await MediaControl.updatePlaybackState(state, position, 1.0);

      if (this.currentMetadata) {
        this.currentMetadata.position = position;
      }
    } catch (error) {
      console.error("Error updating playback state:", error);
    }
  }

  setupRemoteControls(handlers: RemoteCommandHandlers) {
    try {
      this.commandHandlers = { ...this.commandHandlers, ...handlers };
    } catch (error) {
      console.error("Error setting up remote controls:", error);
    }
  }

  async stop() {
    try {
      await MediaControl.updatePlaybackState(PlaybackState.STOPPED, 0);
    } catch (error) {
      console.error("Error stopping media session:", error);
    }
  }

  async release() {
    try {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      await MediaControl.disableMediaControls();
      this.commandHandlers = {};
      this.currentMetadata = null;
      this.isInitialized = false;
    } catch (error) {
      console.error("Error releasing media session:", error);
    }
  }

  /**
   * Get current media control state
   */
  async getState() {
    try {
      return await MediaControl.getCurrentState();
    } catch (error) {
      console.error("❌ Error getting media state:", error);
      return PlaybackState.STOPPED;
    }
  }

  /**
   * Check if media session is initialized
   */
  isInitialized_(): boolean {
    return this.isInitialized;
  }
}

export const mediaSessionService = new MediaSessionService();
