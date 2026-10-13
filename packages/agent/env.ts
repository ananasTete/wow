import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // 任意 OpenAI 端点规范的服务：官方 / DeepSeek / Groq / vLLM / Ollama 等
    OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().default("gpt-4o-mini"),
    DATABASE_URL: z.string().url().optional(),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: {
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    DATABASE_URL: process.env.DATABASE_URL,
  },
});
