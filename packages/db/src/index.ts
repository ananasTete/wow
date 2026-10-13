import * as schema from "./schema";

export { schema };

export type Db = ReturnType<typeof createDb>;

/**
 * 双模式 client：
 * - 传 url：生产/远程，postgres.js 驱动连接真实 PostgreSQL；
 * - 不传 url：本地开发/测试，PGLite 内嵌 PostgreSQL，数据固定落在包内 .data/pg，
 *   与 `pnpm --filter @wow/db migrate` 写入的是同一个库。
 * 同一套 schema 与迁移，两种环境行为一致（同一 PG 引擎）。
 */
export async function createDb(opts: { url?: string; dataDir?: string } = {}) {
  if (opts.url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(opts.url, { max: 10 });
    return drizzle(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const defaultDir = new URL("../.data/pg", import.meta.url).pathname;
  const dataDir = opts.dataDir ?? defaultDir;
  if (dataDir !== ":memory:") {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dataDir, { recursive: true });
  }
  const pglite = await PGlite.create(dataDir);
  return drizzle(pglite, { schema });
}
