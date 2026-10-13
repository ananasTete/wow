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
import type { ChartSpec, WeatherOutput } from "../types";
import { ChartRenderer, ChartSkeleton } from "./chart-renderer";
import { WeatherCard, WeatherCardSkeleton } from "./weather-card";

type Part = UIMessage["parts"][number];

/**
 * 单条消息渲染：parts 分发表（text / reasoning / 天气工具 / 通用工具）。
 * text part 内嵌的 <chart> 标签由 Streamdown allowedTags 通道交给 ChartRenderer。
 */
export function MessageView({ message }: { message: UIMessage }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) => (
          <PartView key={i} part={part} />
        ))}
      </MessageContent>
    </Message>
  );
}

function PartView({ part }: { part: Part }) {
  // 文本（含内嵌 <chart> DSL）
  if (part.type === "text") {
    return (
      <MessageResponse
        allowedTags={{ chart: ["charttype", "title"] }}
        components={{ chart: ChartTagRenderer }}
      >
        {part.text}
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
          title={part.type.replace("tool-", "")}
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
