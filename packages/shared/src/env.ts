import { z } from "zod";

/**
 * 各 app 可在自己的 createEnv 中通过 extends 合并这些片段，
 * 避免重复声明公共变量。
 */
export const sharedServerSchema = {
  DATABASE_URL: z.string().url(),
} as const;

export const sharedClientSchema = {} as const;
