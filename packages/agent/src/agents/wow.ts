import { Agent } from "@mastra/core/agent";
import { CHART_PROMPT } from "../prompts/chart";
import { model } from "../provider";
import { weatherTool } from "../tools/weather";
import { webSearchTool } from "../tools/web-search";

/**
 * 示例 agent：用于 playground 调试与后续 API 设计的基线。
 */
export const wowAgent = new Agent({
  id: "wow-agent",
  name: "wow-agent",
  instructions: [
    "你是 wow 项目的助手。",
    "回答保持简洁，用中文。",
    "不确定时明确说不确定，不要编造。",
    "工具选择规则（互斥，按序匹配，一次回答只走一条路径）：",
    "1. 涉及天气、气温、空气质量、穿衣建议：只用 getWeather。它返回的实时天气、7 天预报、空气质量、生活指数已完整覆盖此类问题，禁止再调用 webSearch 补充，也无需附来源链接。",
    "2. 涉及新闻、近期事件、天气以外的实时信息、你不确定的事实：先用 webSearch（网络搜索）检索再回答，并附来源链接。",
    "3. 天气也属于实时信息，但规则 1 优先：天气类问题只走 getWeather，不要叠加网络搜索。",
    "回复中呈现数据对比、趋势、占比、分布时，按以下图表规范输出 <chart> 块。",
    CHART_PROMPT,
  ].join("\n"),
  model,
  tools: { getWeather: weatherTool, webSearch: webSearchTool },
  // 会话持久化由业务表（chat_thread/chat_message）承担，历史在 chat 端点组装传入；
  // memory.ts 保留备用（后续需要服务端语义记忆时再启用）
});
