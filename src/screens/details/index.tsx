import DetailScreen from "./DetailScreen";
import React from "react";

export const AlbumScreen: React.FC<{
  albumId: string;
}> = ({ albumId }) => {
  return <DetailScreen type="album" id={albumId} />;
};

export const PlaylistScreen: React.FC<{
  playlistId: string;
}> = ({ playlistId }) => {
  return <DetailScreen type="playlist" id={playlistId} />;
};

export const ArtistScreen: React.FC<{
  artistId: string;
  onAlbumPress?: (albumId: string) => void;
}> = ({ artistId, onAlbumPress }) => {
  return (
    <DetailScreen type="artist" id={artistId} onAlbumPress={onAlbumPress} />
  );
};
