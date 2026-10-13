import { Agent } from "@mastra/core/agent";
import { CHART_PROMPT } from "../prompts/chart";
import { model } from "../provider";
import { tavilySearchTool } from "../tools/tavily-search";
import { weatherTool } from "../tools/weather";

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
    "涉及实时信息或近期事件时，先用 tavily-search 检索再回答，并附上来源链接。",
    "涉及天气、气温、空气质量、穿衣建议时，先用 get-weather 查询真实数据再回答。",
    "回复中呈现数据对比、趋势、占比、分布时，按以下图表规范输出 <chart> 块。",
    CHART_PROMPT,
  ].join("\n"),
  model,
  tools: { tavilySearch: tavilySearchTool, getWeather: weatherTool },
  // 会话持久化由业务表（chat_thread/chat_message）承担，历史在 chat 端点组装传入；
  // memory.ts 保留备用（后续需要服务端语义记忆时再启用）
});
