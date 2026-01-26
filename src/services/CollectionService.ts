import { appStorage } from "@/stores/storage";
import { storageCache } from "@/utils/cache";
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

export class CollectionService {
  async getCollections(): Promise<Collection[]> {
    const cacheKey = COLLECTIONS_KEY;

    const cached = storageCache.get(cacheKey);
    if (cached !== null) return cached;

    const data = await appStorage.getItem(COLLECTIONS_KEY);
    const result = data ? JSON.parse(data) : [];

    storageCache.set(cacheKey, result);

    return result;
  }

  async getCollection(collectionId: string): Promise<Collection | null> {
    const collections = await this.getCollections();
    return collections.find((c) => c.id === collectionId) ?? null;
  }

  async createCollection(
    name: string,
    description?: string,
  ): Promise<Collection> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Collection name cannot be empty");
    }

    const collections = await this.getCollections();

    const newCollection: Collection = {
      id: Date.now().toString(),
      name: trimmedName,
      description,
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    collections.push(newCollection);
    await this.saveCollections(collections);

    return newCollection;
  }

  async renameCollection(collectionId: string, newName: string): Promise<void> {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new Error("Collection name cannot be empty");
    }

    const collections = await this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    collection.name = trimmedName;
    collection.updatedAt = new Date().toISOString();
    await this.saveCollections(collections);
  }

  async updateCollectionDescription(
    collectionId: string,
    description: string,
  ): Promise<void> {
    const collections = await this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    collection.description = description;
    collection.updatedAt = new Date().toISOString();
    await this.saveCollections(collections);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const collections = await this.getCollections();
    const filtered = collections.filter((c) => c.id !== collectionId);
    await this.saveCollections(filtered);
  }

  async addToCollection(
    collectionId: string,
    song: Models.Song,
  ): Promise<void> {
    const collections = await this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    if (collection.songs.some((s) => s.id === song.id)) return;

    collection.songs.push(song);
    collection.updatedAt = new Date().toISOString();

    if (!collection.coverUrl) {
      collection.coverUrl = song.images?.[0]?.url;
    }

    await this.saveCollections(collections);
  }

  async addMultipleToCollection(
    collectionId: string,
    songs: Models.Song[],
  ): Promise<void> {
    const collections = await this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    const songIds = new Set(collection.songs.map((s) => s.id));
    const newSongs = songs.filter((song) => !songIds.has(song.id));

    if (newSongs.length === 0) return;

    collection.songs.push(...newSongs);
    collection.updatedAt = new Date().toISOString();

    if (!collection.coverUrl && collection.songs.length > 0) {
      collection.coverUrl = collection.songs[0].images?.[0]?.url;
    }

    await this.saveCollections(collections);
  }

  async removeFromCollection(
    collectionId: string,
    songId: string,
  ): Promise<void> {
    const collections = await this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    collection.songs = collection.songs.filter((s) => s.id !== songId);
    collection.updatedAt = new Date().toISOString();

    if (collection.songs.length === 0) {
      collection.coverUrl = undefined;
    }

    await this.saveCollections(collections);
  }

  async reorderInCollection(
    collectionId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<void> {
    const collections = await this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    const { songs } = collection;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= songs.length ||
      toIndex >= songs.length
    ) {
      throw new Error("Invalid reorder indices");
    }

    const [song] = songs.splice(fromIndex, 1);
    songs.splice(toIndex, 0, song);
    collection.updatedAt = new Date().toISOString();

    await this.saveCollections(collections);
  }

  private async saveCollections(collections: Collection[]): Promise<void> {
    await appStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));

    storageCache.invalidatePattern(/^@collections/);
  }
}

export const collectionService = new CollectionService();
