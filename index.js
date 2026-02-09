import { setFetchConfig } from "@saavn-labs/sdk";
import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

setFetchConfig({
  baseUrl: "https://sausico.pages.dev/saavn",
});

export function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
