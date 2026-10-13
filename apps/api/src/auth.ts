import { createDb, schema } from "@wow/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const db = await createDb(
  process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : {},
);

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
  advanced: {
    // cookie 前缀避免与其他服务的 auth cookie 冲突
    cookiePrefix: "wow",
  },
});

export type Session = typeof auth.$Infer.Session;
