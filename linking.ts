export const linking = {
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
