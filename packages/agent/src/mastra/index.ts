import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { env } from "../../env";
import { wowAgent } from "../agents/wow";

export const mastra = new Mastra({
  agents: { wowAgent },
  // 生产（设了 DATABASE_URL）用 PG；本地 playground 未设时用默认内存存储
  storage: env.DATABASE_URL
    ? new PostgresStore({ connectionString: env.DATABASE_URL })
    : undefined,
});
