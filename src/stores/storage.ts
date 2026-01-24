import { StateStorage } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";
import AsyncStorage from "@react-native-async-storage/async-storage";

let storage: StateStorage;

const mmkv = createMMKV({
  id: "app-storage",
});

try {
  storage = {
    setItem: (name: string, value: string) => {
      mmkv.set(name, value);
    },
    getItem: (name: string) => {
      const value = mmkv.getString(name);
      return value ?? null;
    },
    removeItem: (name: string) => {
      mmkv.remove(name);
    },
  };
} catch (e) {
  storage = {
    getItem: async (name: string): Promise<string | null> => {
      return (await AsyncStorage.getItem(name)) || null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
      await AsyncStorage.setItem(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
      await AsyncStorage.removeItem(name);
    },
  };
}

export { storage as appStorage };
