import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { env } from "../../env";

/**
 * Tavily web search：agent 联网检索的统一入口。
 * https://docs.tavily.com/documentation/api-reference/endpoint/search
 */
export const tavilySearchTool = createTool({
  id: "tavily-search",
  description:
    "搜索互联网获取最新信息。当问题涉及实时数据、近期事件或模型不确定的事实时使用。",
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
