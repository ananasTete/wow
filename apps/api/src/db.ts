import { createDb } from "@wow/db";

/**
 * API 进程唯一的 db 实例（PGLite 本地模式下多实例开同一数据目录会锁冲突，
 * 必须与 auth.ts 等共享）。生产（DATABASE_URL）走 postgres.js 连接池。
 */
export const db = await createDb(
  process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : {},
);
