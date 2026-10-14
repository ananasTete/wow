import { GlobeIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "#/components/ui/hover-card";

import type { WebSearchResult } from "../types";

/** 引用编号 → 搜索结果的查找表（MessageView 从本消息全部 webSearch 工具 parts 汇总） */
export type CitationMap = Map<number, WebSearchResult>;

/** URL → 展示域名（气泡里给用户一个可读的来源标识） */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * 站点图标：直接加载目标站 /favicon.ico，失败（404/不可达/畸形 URL）显示地球图标兜底。
 * 不引入第三方 favicon 代理——部分网络环境下不可达，且 origin+固定路径前端即可构造。
 * 导出复用：citation 气泡、webSearch 行内条 favicon 叠加、搜索结果侧边栏共用。
 */
export function SiteIcon({
  result,
  className,
}: {
  result: WebSearchResult;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  let src: string | null = null;
  try {
    src = `${new URL(result.url).origin}/favicon.ico`;
  } catch {
    src = null;
  }
  if (failed || !src) {
    return <GlobeIcon aria-hidden="true" className={className} />;
  }
  return (
    <img
      alt=""
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      src={src}
    />
  );
}

/** 单条搜索结果的展示结构（域名行 + 标题 + 两行摘要），citation 气泡与侧边栏共用。
 *  整个条目即链接（大点击区域），标题在 hover 时下划线暗示可点 */
export function SearchResultItem({ result }: { result: WebSearchResult }) {
  return (
    <a
      className="flex flex-col gap-1.5 underline-offset-2 hover:[&_span[data-title]]:underline"
      href={result.url}
      rel="noreferrer"
      target="_blank"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <SiteIcon className="text-muted-foreground size-3.5 shrink-0" result={result} />
        <p className="text-muted-foreground truncate text-xs">{hostOf(result.url)}</p>
      </div>
      <span className="line-clamp-2 font-medium" data-title>
        {result.title}
      </span>
      <p className="line-clamp-2 text-sm">{result.content}</p>
    </a>
  );
}

/**
 * 引用胶囊：正文里 <citation i="N" /> 的渲染形态。
 * 有对应搜索结果时 hover 弹出来源卡片；查不到（编号幻觉/流式中）降级为静态胶囊。
 */
export function CitationTag({
  index,
  result,
}: {
  index: number;
  result?: WebSearchResult;
}) {
  if (!result) {
    return (
      <span className="text-muted-foreground bg-muted mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 align-[0.15em] text-[10px] leading-none tabular-nums">
        {index}
      </span>
    );
  }

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        {/* 胶囊本身即来源链接：点击新标签页打开；hover 预览不拦截导航 */}
        <a
          className="bg-primary/10 text-primary mx-0.5 inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded-full px-1 align-[0.15em] text-[10px] leading-none tabular-nums transition-colors hover:bg-primary/20"
          href={result.url}
          rel="noreferrer"
          target="_blank"
        >
          {index}
        </a>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80" side="top">
        <SearchResultItem result={result} />
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * streamdown 通道的 <citation> 渲染器：属性经 HTML 解析后放 node.properties（i 为字符串）。
 * citations 来自外层 MessageView 闭包注入。
 */
export function CitationTagRenderer(
  props: Record<string, unknown>,
  citations?: CitationMap,
): ReactNode {
  const properties = (props.node as { properties?: Record<string, unknown> })?.properties;
  const i = Number(properties?.i);
  if (!Number.isInteger(i) || i < 1) return null;
  return <CitationTag index={i} result={citations?.get(i)} />;
}
