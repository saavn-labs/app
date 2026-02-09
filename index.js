import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import { setFetchConfig } from "@saavn-labs/sdk";

setFetchConfig({
  baseUrl: "https://sausic.pages.dev/saavn",
});

export function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
