/**
 * 迁移入口：有 DATABASE_URL 时对远程 PG 执行迁移，否则对本地 PGLite 目录执行。
 */
import { mkdirSync } from "node:fs";

const url = process.env.DATABASE_URL;
const migrationsFolder = new URL("../drizzle", import.meta.url).pathname;

if (url) {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const sql = postgres(url, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder });
  console.log("migrated (remote postgres)");
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  mkdirSync(".data/pg", { recursive: true });
  const db = drizzle(await PGlite.create(".data/pg"));
  await migrate(db, { migrationsFolder });
  console.log("migrated (local pglite: .data/pg)");
}
process.exit(0);
