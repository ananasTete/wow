import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";
import { env } from "../env";

/**
 * 记忆按 resourceId + threadId 隔离：每个会话（thread）各自独立，
 * 不会读到其他会话的上下文。调用方（playground / API）为每个会话
 * 传入不同的 threadId，同一用户（resourceId）的会话列表可单独查询。
 *
 * 存储：生产（DATABASE_URL）用 PG；本地用 LibSQL 文件库，固定落在
 * packages/agent/.data/memory.db，重启后记忆仍在。
 * 锚定方式：从 cwd 向上找最近的 package.json（即本包根目录）——
 * 既不能用 import.meta.url（mastra dev 会打包到 .mastra/output），
 * 也不能直接用 cwd（mastra dev 的 cwd 是 src/mastra）。
 */
function pkgRoot(): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, "package.json"))) {
    dir = dirname(dir);
  }
  return dir;
}

const dataDir = process.env.WOW_MEMORY_DIR ?? join(pkgRoot(), ".data/");
mkdirSync(dataDir, { recursive: true });

export const memory = new Memory({
  storage: env.DATABASE_URL
    ? new PostgresStore({ connectionString: env.DATABASE_URL })
    : new LibSQLStore({
        id: "wow-memory",
        url: `file:${dataDir}memory.db`,
      }),
  options: {
    // 仅同一 thread 内召回历史，保持会话间隔离的语义清晰
    lastMessages: 20,
    semanticRecall: false,
  },
});
