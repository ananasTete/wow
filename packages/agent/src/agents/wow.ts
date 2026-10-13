import { Agent } from "@mastra/core/agent";
import { memory } from "../memory";
import { model } from "../provider";
import { tavilySearchTool } from "../tools/tavily-search";

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
  ].join("\n"),
  model,
  tools: { tavilySearch: tavilySearchTool },
  memory,
});
