import { type ExecutionContext, Hono } from "hono";
import saavnRoutes from "./_app/routes/saavn.routes";
import seoRoutes from "./_app/routes/seo.routes";

type Bindings = {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const path = c.req.path.toLowerCase();
  
  if (path.startsWith("/google")) {
    return c.notFound();
  }

  c.res.headers.set("Access-Control-Allow-Origin", "*");
  
  await next();
});

app.route("/saavn", saavnRoutes);
app.route("/", seoRoutes);

export const onRequest = async ({
  request,
  env,
  context,
}: {
  request: Request;
  env: Bindings;
  context: ExecutionContext;
}) => {
  const response = await app.fetch(request, env, context);

  if (response.status === 404) {
    return env.ASSETS.fetch(request);
  }

  return response;
};

export default {
  fetch: onRequest,
};
