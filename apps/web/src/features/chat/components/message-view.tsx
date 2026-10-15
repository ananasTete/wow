import type { ToolUIPart, UIMessage } from "ai";
import React from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "#/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "#/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "#/components/ai-elements/tool";
import { tolerantParse } from "../lib/tolerant-parse";
import type { ChartSpec, WeatherOutput, WebSearchResult } from "../types";
import { ChartRenderer, ChartSkeleton } from "./chart-renderer";
import { type CitationMap, CitationTagRenderer } from "./citation-tag";
import { WeatherCard, WeatherCardSkeleton } from "./weather-card";
import { WebSearchToolView } from "./web-search-tool-view";

type Part = UIMessage["parts"][number];

/** 工具名（tool- 后的部分）→ 展示名；旧名 tavilySearch 为重命名前的历史消息 */
const TOOL_TITLES: Record<string, string> = {
  webSearch: "网络搜索",
  tavilySearch: "网络搜索",
};

/**
 * 汇总本消息全部搜索结果为「引用编号 → 结果」表，供正文 <citation> 查找。
 * 旧数据无 index 字段时按结果出现顺序补号（1..n）。
 */
function collectCitations(parts: Part[]): CitationMap {
  const map: CitationMap = new Map();
  let fallback = 1;
  for (const part of parts) {
    if (part.type !== "tool-webSearch") continue;
    // Set.has 无法窄化联合类型，工具 part 的字段经断言访问
    const { state, output } = part as {
      state?: string;
      output?: { results?: WebSearchResult[] };
    };
    if (state !== "output-available") continue;
    const results = output?.results;
    if (!Array.isArray(results)) continue;
    for (const r of results) {
      const index = typeof r.index === "number" ? r.index : fallback++;
      map.set(index, { ...r, index });
    }
  }
  return map;
}

/**
 * 单条消息渲染：parts 分发表（text / reasoning / 天气工具 / 搜索工具 / 通用工具）。
 * text part 内嵌的 <chart>/<citation> 标签由 Streamdown allowedTags 通道渲染。
 */
export function MessageView({
  message,
  threadId,
}: {
  message: UIMessage;
  threadId: string;
}) {
  const citations = collectCitations(message.parts);
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) => (
          <PartView citations={citations} key={i} part={part} threadId={threadId} />
        ))}
      </MessageContent>
    </Message>
  );
}

/** 自闭合 citation → 显式闭合。HTML 解析对非 void 元素忽略 "/>"，
 *  不规范化的话 <citation i="1" /> 会被当开放标签，把后续内容嵌套进去 */
const SELF_CLOSING_CITATION = /<citation i="?(\d+)"?\s*\/>/g;

function normalizeCitations(text: string): string {
  return text.replace(SELF_CLOSING_CITATION, '<citation i="$1"></citation>');
}

function PartView({
  part,
  citations,
  threadId,
}: {
  part: Part;
  citations: CitationMap;
  threadId: string;
}) {
  // 文本（含内嵌 <chart> DSL 与 <citation> 引用标注）
  if (part.type === "text") {
    return (
      <MessageResponse
        allowedTags={{ chart: ["charttype", "title"], citation: ["i"] }}
        components={{
          chart: ChartTagRenderer,
          citation: (props) => CitationTagRenderer(props, citations),
        }}
      >
        {normalizeCitations(part.text)}
      </MessageResponse>
    );
  }

  // 思考过程（流式展开，完成 1s 后自动收起）
  if (part.type === "reasoning") {
    return (
      <Reasoning isStreaming={part.state === "streaming"}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }

  // 天气工具：专属卡片（方案 A）
  if (part.type === "tool-getWeather") {
    if (part.state === "output-available") {
      return <WeatherCard data={part.output as WeatherOutput} />;
    }
    if (part.state === "output-error") {
      return <p className="text-destructive text-sm">天气查询失败：{part.errorText}</p>;
    }
    return <WeatherCardSkeleton />;
  }

  // 搜索工具：行内状态条，完成后点击打开右侧结果面板（旧名 tavilySearch 同结构）
  if (part.type === "tool-webSearch") {
    const toolPart = part as Part & {
      toolCallId: string;
      state: string;
      input?: { query?: string };
      output?: { results?: WebSearchResult[] };
      errorText?: string;
    };
    return (
      <WebSearchToolView
        part={{
          toolCallId: toolPart.toolCallId,
          state: toolPart.state,
          input: toolPart.input,
          output: toolPart.output,
          errorText: toolPart.errorText,
        }}
        threadId={threadId}
      />
    );
  }

  // 其他工具：通用 JSON 展示
  if (part.type.startsWith("tool-")) {
    const toolPart = part as Part & {
      state: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
    };
    return (
      <Tool>
        <ToolHeader
          state={toolPart.state as ToolUIPart["state"]}
          title={TOOL_TITLES[part.type.slice(5)] ?? part.type.replace("tool-", "")}
          type={part.type as `tool-${string}`}
        />
        <ToolContent>
          <ToolInput input={toolPart.input} />
          <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
        </ToolContent>
      </Tool>
    );
  }

  return null;
}

/** 从嵌套的 React children 里递归提取纯文本（streamdown 会把标签体包一层中间元素） */
function extractText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (React.isValidElement(child)) {
        return extractText((child.props as { children?: React.ReactNode }).children);
      }
      return "";
    })
    .join("");
}

/** <chart> 标签渲染：JSON 在标签体，流式半截时骨架屏 */
function ChartTagRenderer(props: Record<string, unknown>) {
  // 注意：HTML 解析会把属性名小写化（chartType -> charttype），
  // allowedTags 白名单与取值都必须用小写
  const properties = (props.node as { properties?: Record<string, unknown> })?.properties;
  const raw = extractText(props.children as React.ReactNode);
  const spec = tolerantParse<ChartSpec>(raw);
  const title = properties?.title as string | undefined;
  if (!spec) return <ChartSkeleton title={title} />;
  return <ChartRenderer spec={spec} title={title} />;
}
