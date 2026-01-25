import type { StateStorage } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

const mmkv = createMMKV({
  id: "app-storage",
});

export const appStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = mmkv.getString(name);
    return value ?? null;
  },

  setItem: (name: string, value: string): void => {
    mmkv.set(name, value);
  },

  removeItem: (name: string): void => {
    mmkv.remove(name);
  },
};
