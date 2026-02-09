import { setFetchConfig } from "@saavn-labs/sdk";
import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

setFetchConfig({
  baseUrl: "https://sausico.pages.dev/saavn",
});

const linking = {
  prefixes: ["https://sausico.pages.dev", "https://*.sausico.pages.dev"],
  config: {
    screens: {
      "(tabs)": {
        screens: {
          index: "",
          search: "search",
          library: "library",
          downloads: "downloads",
        },
      },
      "song/[id]": "song/:id",
      "album/[id]": "album/:id",
      "artist/[id]": "artist/:id",
      "playlist/[id]": "playlist/:id",
      history: "history",
    },
  },
};

export function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} linking={linking} />;
}

registerRootComponent(App);
