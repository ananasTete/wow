import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "../env";

/**
 * 全项目唯一的 AI provider。所有 agent 都从这里取模型，
 * 接入哪家服务只改环境变量，不动代码。
 */
export const provider = createOpenAICompatible({
  name: "openai-compatible",
  baseURL: env.OPENAI_BASE_URL,
  apiKey: env.OPENAI_API_KEY,
});

export const model = provider(env.OPENAI_MODEL);
