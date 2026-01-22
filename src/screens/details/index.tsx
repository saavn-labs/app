import DetailScreen from "./DetailScreen";
import React from "react";

export const AlbumScreen: React.FC<{
  albumId: string;
  onBack: () => void;
}> = ({ albumId, onBack }) => {
  return <DetailScreen type="album" id={albumId} onBack={onBack} />;
};

export const PlaylistScreen: React.FC<{
  playlistId: string;
  onBack: () => void;
}> = ({ playlistId, onBack }) => {
  return <DetailScreen type="playlist" id={playlistId} onBack={onBack} />;
};

export const ArtistScreen: React.FC<{
  artistId: string;
  onBack: () => void;
  onAlbumPress?: (albumId: string) => void;
}> = ({ artistId, onBack, onAlbumPress }) => {
  return (
    <DetailScreen
      type="artist"
      id={artistId}
      onBack={onBack}
      onAlbumPress={onAlbumPress}
    />
  );
};
