import { Models } from "@saavn-labs/sdk";
import React from "react";
import MediaItem from "../common/MediaItem";

interface PlaylistItemProps {
  playlist: Models.Playlist;
  onPress: () => void;
  horizontal?: boolean;
}

const PlaylistItem: React.FC<PlaylistItemProps> = ({
  playlist,
  onPress,
  horizontal = false,
}) => {
  return (
    <MediaItem
      data={playlist}
      type="playlist"
      onPress={onPress}
      horizontal={horizontal}
    />
  );
};

export default PlaylistItem;
