import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { env } from "../../env";

/**
 * 网络搜索（底层为 Tavily API）：agent 联网检索的统一入口。
 * https://docs.tavily.com/documentation/api-reference/endpoint/search
 *
 * 命名注意：发给模型的函数名是 Agent tools 注册表的 key（webSearch），
 * OpenAI 兼容接口仅允许 [a-zA-Z0-9_-]；中文"网络搜索"只出现在描述与前端展示名里。
 */
export const webSearchTool = createTool({
  id: "web-search",
  description:
    "网络搜索：检索互联网上的最新信息。用于新闻、近期事件、天气以外的实时信息、或模型不确定的事实。" +
    "天气、气温、空气质量、穿衣建议类问题禁止使用本工具，请改用 getWeather。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，用目标信息所在语言表述"),
    maxResults: z.number().int().min(1).max(10).default(5),
    searchDepth: z.enum(["basic", "advanced"]).default("basic"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      }),
    ),
  }),
  execute: async ({ query, maxResults, searchDepth }) => {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: searchDepth,
      }),
    });
    if (!res.ok) {
      throw new Error(`tavily search failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      results: { title: string; url: string; content: string }[];
    };
    return {
      results: data.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      })),
    };
  },
});
