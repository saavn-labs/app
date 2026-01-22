import AsyncStorage from "@react-native-async-storage/async-storage";
import { Models } from "@saavn-labs/sdk";

const COLLECTIONS_KEY = "@collections";

export interface Collection {
  id: string;
  name: string;
  description?: string;
  songs: Models.Song[];
  createdAt: string;
  updatedAt: string;
  coverUrl?: string;
}

/**
 * CollectionService - Manages local playlists called "Collections"
 * This is Spotify-like local playlist functionality
 */
export class CollectionService {
  async getCollections(): Promise<Collection[]> {
    try {
      const data = await AsyncStorage.getItem(COLLECTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting collections:", error);
      return [];
    }
  }

  async getCollection(collectionId: string): Promise<Collection | null> {
    try {
      const collections = await this.getCollections();
      return collections.find((c) => c.id === collectionId) || null;
    } catch (error) {
      console.error("Error getting collection:", error);
      return null;
    }
  }

  async createCollection(
    name: string,
    description?: string,
  ): Promise<Collection> {
    try {
      const collections = await this.getCollections();
      const newCollection: Collection = {
        id: Date.now().toString(),
        name,
        description,
        songs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      collections.push(newCollection);
      await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
      return newCollection;
    } catch (error) {
      console.error("Error creating collection:", error);
      throw error;
    }
  }

  async renameCollection(collectionId: string, newName: string): Promise<void> {
    try {
      const collections = await this.getCollections();
      const collection = collections.find((c) => c.id === collectionId);

      if (collection) {
        collection.name = newName;
        collection.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(
          COLLECTIONS_KEY,
          JSON.stringify(collections),
        );
      }
    } catch (error) {
      console.error("Error renaming collection:", error);
      throw error;
    }
  }

  async updateCollectionDescription(
    collectionId: string,
    description: string,
  ): Promise<void> {
    try {
      const collections = await this.getCollections();
      const collection = collections.find((c) => c.id === collectionId);

      if (collection) {
        collection.description = description;
        collection.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(
          COLLECTIONS_KEY,
          JSON.stringify(collections),
        );
      }
    } catch (error) {
      console.error("Error updating collection description:", error);
      throw error;
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    try {
      const collections = await this.getCollections();
      const filtered = collections.filter((c) => c.id !== collectionId);
      await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error deleting collection:", error);
      throw error;
    }
  }

  async addToCollection(
    collectionId: string,
    song: Models.Song,
  ): Promise<void> {
    try {
      const collections = await this.getCollections();
      const collection = collections.find((c) => c.id === collectionId);

      if (collection) {
        const exists = collection.songs.some((s) => s.id === song.id);
        if (!exists) {
          collection.songs.push(song);
          collection.updatedAt = new Date().toISOString();

          if (!collection.coverUrl && song.images && song.images.length > 0) {
            collection.coverUrl = song.images[0].url;
          }

          await AsyncStorage.setItem(
            COLLECTIONS_KEY,
            JSON.stringify(collections),
          );
        }
      }
    } catch (error) {
      console.error("Error adding to collection:", error);
      throw error;
    }
  }

  async addMultipleToCollection(
    collectionId: string,
    songs: Models.Song[],
  ): Promise<void> {
    try {
      const collections = await this.getCollections();
      const collection = collections.find((c) => c.id === collectionId);

      if (collection) {
        const songIds = new Set(collection.songs.map((s) => s.id));

        songs.forEach((song) => {
          if (!songIds.has(song.id)) {
            collection.songs.push(song);
            songIds.add(song.id);
          }
        });

        collection.updatedAt = new Date().toISOString();

        if (!collection.coverUrl && collection.songs.length > 0) {
          const firstSong = collection.songs[0];
          if (firstSong.images && firstSong.images.length > 0) {
            collection.coverUrl = firstSong.images[0].url;
          }
        }

        await AsyncStorage.setItem(
          COLLECTIONS_KEY,
          JSON.stringify(collections),
        );
      }
    } catch (error) {
      console.error("Error adding multiple songs to collection:", error);
      throw error;
    }
  }

  async removeFromCollection(
    collectionId: string,
    songId: string,
  ): Promise<void> {
    try {
      const collections = await this.getCollections();
      const collection = collections.find((c) => c.id === collectionId);

      if (collection) {
        collection.songs = collection.songs.filter((s) => s.id !== songId);
        collection.updatedAt = new Date().toISOString();

        if (collection.songs.length === 0) {
          collection.coverUrl = undefined;
        }

        await AsyncStorage.setItem(
          COLLECTIONS_KEY,
          JSON.stringify(collections),
        );
      }
    } catch (error) {
      console.error("Error removing from collection:", error);
      throw error;
    }
  }

  async reorderInCollection(
    collectionId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<void> {
    try {
      const collections = await this.getCollections();
      const collection = collections.find((c) => c.id === collectionId);

      if (collection && fromIndex >= 0 && toIndex >= 0) {
        const [song] = collection.songs.splice(fromIndex, 1);
        collection.songs.splice(toIndex, 0, song);
        collection.updatedAt = new Date().toISOString();

        await AsyncStorage.setItem(
          COLLECTIONS_KEY,
          JSON.stringify(collections),
        );
      }
    } catch (error) {
      console.error("Error reordering in collection:", error);
      throw error;
    }
  }

  async isInCollection(collectionId: string, songId: string): Promise<boolean> {
    try {
      const collection = await this.getCollection(collectionId);
      return collection ? collection.songs.some((s) => s.id === songId) : false;
    } catch (error) {
      console.error("Error checking if song is in collection:", error);
      return false;
    }
  }

  async getCollectionsContainingSong(songId: string): Promise<Collection[]> {
    try {
      const collections = await this.getCollections();
      return collections.filter((c) => c.songs.some((s) => s.id === songId));
    } catch (error) {
      console.error("Error getting collections containing song:", error);
      return [];
    }
  }

  async duplicateCollection(
    collectionId: string,
    newName: string,
  ): Promise<Collection | null> {
    try {
      const original = await this.getCollection(collectionId);
      if (!original) return null;

      const newCollection = await this.createCollection(
        newName,
        original.description,
      );
      await this.addMultipleToCollection(newCollection.id, original.songs);

      return newCollection;
    } catch (error) {
      console.error("Error duplicating collection:", error);
      return null;
    }
  }
}

export const collectionService = new CollectionService();
