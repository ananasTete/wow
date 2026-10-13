import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { env } from "../env";
import { auth, type Session } from "./auth";

const app = new Hono<{ Variables: { session: Session } }>();

app.use(logger());

// better-auth 全量接管 /auth/*（sign-up/email、sign-in/email、sign-out、get-session 等）
app.all("/auth/*", (c) => auth.handler(c.req.raw));

// session 中间件：受保护路由挂在 /api 下
app.use("/api/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.header() });
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("session", session);
  await next();
});

app.get("/api/me", (c) => {
  const { user } = c.get("session");
  return c.json({ id: user.id, email: user.email, name: user.name });
});

app.get("/health", (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
});
