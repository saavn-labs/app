import { Models } from "@saavn-labs/sdk";
import React from "react";
import MediaItem from "../common/MediaItem";

interface ArtistItemProps {
  artist: Models.Artist;
  onPress: () => void;
  horizontal?: boolean;
}

const ArtistItem: React.FC<ArtistItemProps> = ({
  artist,
  onPress,
  horizontal = false,
}) => {
  return (
    <MediaItem
      data={artist}
      type="artist"
      onPress={onPress}
      horizontal={horizontal}
    />
  );
};

export default ArtistItem;
