import { Hono } from "hono";

const saavnRoutes = new Hono();

saavnRoutes.all("/*", async (c) => {
  const url = new URL(c.req.url);
  const path = c.req.path.replace(/^\/saavn\/?/, "");

  const targetUrl = `https://www.jiosaavn.com/${path}${url.search}`;

  const res = await fetch(targetUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        c.req.header("User-Agent") ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
});

export default saavnRoutes;
