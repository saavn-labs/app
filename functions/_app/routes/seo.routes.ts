import { Album, Artist, Playlist, Song } from "@saavn-labs/sdk";
import { Hono } from "hono";

const seoRoutes = new Hono();

const botKeywords = [
  "bot",
  "crawl",
  "slurp",
  "spider",
  "embed",
  "preview",
  "fetch",
  "scan",
  "render",
  "monitor",
  "scrape",
  "linkexpander",
  "google",
  "facebook",
  "twitter",
  "discord",
  "linkedin",
  "whatsapp",
  "telegram",
  "pinterest",
  "gptbot",
  "duckduck",
  "yandex",
  "applebot",
  "bingbot",
  "redditbot",
  "vkshare",
];

export function isBot(userAgent = ""): boolean {
  const ua = userAgent.toLowerCase();
  return botKeywords.some((keyword) => ua.includes(keyword));
}

type SeoType = "song" | "artist" | "album" | "playlist";

type SeoData = {
  title: string;
  description: string;
  image?: string;
};

async function buildSeoShell(type: SeoType, id: string): Promise<string> {
  let data: SeoData;

  switch (type) {
    case "song": {
      const res = await Song.getById({ songIds: id });
      const song = res.songs[0];

      const artists =
        song.artists?.primary?.map((a) => a.name).join(", ") ||
        "Unknown Artist";

      data = {
        title: `${song.title} – ${artists}`,
        description: `Listen to ${song.title} by ${artists}. Stream the song in high quality and explore more music on Sausico.`,
        image: song.images?.[1]?.url,
      };
      break;
    }

    case "artist": {
      const artist = await Artist.getById({ artistId: id });

      data = {
        title: artist.name,
        description: `Discover songs, albums, and playlists by ${artist.name}. Stream their latest and most popular tracks on Sausico.`,
        image: artist.images?.[1]?.url,
      };
      break;
    }

    case "album": {
      const album = await Album.getById({ albumId: id });

      const artists =
        album.artists?.primary?.map((a) => a.name).join(", ") ||
        "Various Artists";

      data = {
        title: `${album.title} – ${artists}`,
        description: `Listen to the album ${album.title} by ${artists}. Explore all tracks and enjoy seamless music streaming on Sausico.`,
        image: album.images?.[1]?.url,
      };
      break;
    }

    case "playlist": {
      const playlist = await Playlist.getById({ playlistId: id });

      data = {
        title: playlist.title,
        description: `Play the playlist ${playlist.title}. Enjoy a curated collection of songs and discover new music on Sausico.`,
        image: playlist.images?.[1]?.url,
      };
      break;
    }
  }

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>${data.title}</title>
        <meta name="description" content="${data.description}" />

        <meta property="og:type" content="music.${type}" />
        <meta property="og:title" content="${data.title}" />
        <meta property="og:description" content="${data.description}" />
        ${data.image ? `<meta property="og:image" content="${data.image}" />` : ""}
        <meta property="og:url" content="/${type}/${id}" />

        <meta name="twitter:card" content="summary_large_image" />
      </head>

      <body>
        <h1>${data.title}</h1>
        <p>${data.description}</p>
      </body>
    </html>`;
}

seoRoutes.get("/:type/:id", async (c) => {
  const ua = c.req.header("User-Agent") || "";

  if (!isBot(ua)) {
    return c.notFound();
  }

  const typeParam = c.req.param("type");
  const id = c.req.param("id");

  if (!["song", "artist", "album", "playlist"].includes(typeParam)) {
    return c.notFound();
  }

  const html = await buildSeoShell(typeParam as SeoType, id);
  return c.html(html);
});

export default seoRoutes;
