import { Hono } from "hono";

const updateRoutes = new Hono();

function isNewerVersion(latest: string, current: string) {
  const l = latest.split(".").map(Number);
  const c = current.split(".").map(Number);

  for (let i = 0; i < l.length; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

const ARCH_APK_MAP: Record<string, string> = {
  "arm64-v8a": "app-arm64-v8a-release.apk",
  "armeabi-v7a": "app-armeabi-v7a-release.apk",
  x86: "app-x86-release.apk",
  x86_64: "app-x86_64-release.apk",
};

updateRoutes.post("/check", async (c) => {
  try {
    let body;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { version, arch } = body;

    if (!version) {
      return c.json({ error: "Version required" }, 400);
    }

    const res = await fetch(
      "https://api.github.com/repos/saavn-labs/app/releases/latest",
      {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "Saavn Labs App" },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("GitHub API failed:", res.status, text);
      return c.json({ error: "GitHub API failed" }, 502);
    }

    const data = await res.json();

    if (!data.tag_name || !data.assets) {
      return c.json({ error: "Invalid release data" }, 500);
    }

    const latestVersion = data.tag_name.replace(/^v/, "");

    const apkName = ARCH_APK_MAP[arch] ?? ARCH_APK_MAP["arm64-v8a"];

    const apk = data.assets.find((a: any) => a.name === apkName);

    if (!apk) {
      return c.json({ error: "No APK found for arch: " + arch }, 404);
    }

    const changelog = parseChangelog(data.body ?? "");

    const releaseInfo = {
      version: latestVersion,
      latestVersion,
      name: data.name,
      publishedAt: data.published_at,
      releaseUrl: data.html_url,
      changelog,
      apkUrl: apk.browser_download_url,
      apk: {
        url: apk.browser_download_url,
        name: apk.name,
        size: apk.size,
        sizeFormatted: formatBytes(apk.size),
        digest: apk.digest,
        downloadCount: apk.download_count,
        createdAt: apk.created_at,
      },
    };

    return c.json({
      updateAvailable: isNewerVersion(latestVersion, version),
      ...releaseInfo,
    });

  } catch (e) {
    console.error("Update check failed:", e);
    return c.json({ error: "Update check failed" }, 500);
  }
});

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function parseChangelog(body: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let currentSection = "";

  for (const line of body.split("\n")) {
    const heading = line.match(/^\*\*(.+)\*\*$/);
    if (heading) {
      currentSection = heading[1].trim();
      sections[currentSection] = [];
    } else if (currentSection && line.startsWith("*")) {
      sections[currentSection].push(line.replace(/^\*\s*/, "").trim());
    }
  }

  return sections;
}

export default updateRoutes;
