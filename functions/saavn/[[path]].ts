export async function onRequest(context: any) {
  const { request, params } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(request.url);

  const path = params.path ? params.path.join("/") : "";

  const targetUrl = `https://www.jiosaavn.com/${path}${url.search}`;
  
  const res = await fetch(targetUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        request.headers.get("User-Agent") ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}
