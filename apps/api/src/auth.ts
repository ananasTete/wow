import { schema } from "@wow/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db";

export const auth = betterAuth({
  basePath: "/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  // 本地 web 经 vite proxy 到 api (3000)，origin 与 baseURL 不同端口，需显式信任；
  // vite 端口被占会自动跳到 5174/5175…，故用端口通配符覆盖 localhost/127.0.0.1/[::1]。
  // 生产必须用 TRUSTED_ORIGINS 覆盖为真实前端域名
  trustedOrigins: (
    process.env.TRUSTED_ORIGINS ?? "http://localhost:*,http://127.0.0.1:*,http://[::1]:*"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  advanced: {
    // cookie 前缀避免与其他服务的 auth cookie 冲突
    cookiePrefix: "wow",
  },
});

export type Session = typeof auth.$Infer.Session;
