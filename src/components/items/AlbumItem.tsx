import { Models } from "@saavn-labs/sdk";
import React from "react";
import MediaItem from "../common/MediaItem";

interface AlbumItemProps {
  album: Models.Album;
  onPress: () => void;
  horizontal?: boolean;
}

const AlbumItem: React.FC<AlbumItemProps> = ({
  album,
  onPress,
  horizontal = false,
}) => {
  return (
    <MediaItem
      data={album}
      type="album"
      onPress={onPress}
      horizontal={horizontal}
    />
  );
};

export default AlbumItem;
