import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { env } from "../../env";

/**
 * tavily 默认（不开 include_raw_content）的 content 是 query 相关片段纯文本，
 * 偶混入 markdown 标记与全角空格缩进；只做标记清洗，不切段、不截断，完整返回。
 */
function stripMarkdown(content: string): string {
  return content
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) → text
    .replace(/[*_`#>~]+/g, "") // markdown 标记（包裹语义，删标记留内容，原空格保留）
    .replace(/[\u00a0\u3000]/g, " ") // nbsp / 全角空格
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * 网络搜索（底层为 Tavily API）：agent 联网检索的统一入口。
 * https://docs.tavily.com/documentation/api-reference/endpoint/search
 *
 * 命名注意：发给模型的函数名是 Agent tools 注册表的 key（webSearch），
 * OpenAI 兼容接口仅允许 [a-zA-Z0-9_-]；中文"网络搜索"只出现在描述与前端展示名里。
 * favicon 不在 schema 里：tavily 不返回，前端直接用 <origin>/favicon.ico 加载并兜底。
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
    startIndex: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe(
        "本次结果的起始引用编号：单次回答内第一次搜索传 1（或缺省）；" +
          "同一回答中再次搜索必须接续上次最后一个结果的编号，保证全文引用编号不重复",
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        index: z.number().int().describe("全文引用编号，正文 <citation i> 引用它"),
        title: z.string(),
        url: z.string(),
        content: z.string().describe("纯文本摘要（已剥离 markdown 标记）"),
      }),
    ),
  }),
  execute: async ({ query, maxResults, searchDepth, startIndex }) => {
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
      results: data.results.map((r, i) => ({
        index: startIndex + i,
        title: r.title,
        url: r.url,
        content: stripMarkdown(r.content),
      })),
    };
  },
});
