import { SearchIcon } from "lucide-react";

import { cn } from "#/lib/utils";

import { useSearchPanelStore } from "../search-panel-store";
import type { WebSearchResult } from "../types";
import { SiteIcon } from "./citation-tag";

/** webSearch tool part 的窄化视图（流式/完成/失败三态字段） */
export interface WebSearchToolPartView {
  toolCallId: string;
  state: string;
  input?: { query?: string };
  output?: { results?: WebSearchResult[] };
  errorText?: string;
}

/** favicon 叠加：最多显示前 4 个结果的站点图标，ring 用背景色分隔重叠 */
function FaviconStack({ results }: { results: WebSearchResult[] }) {
  const shown = results.slice(0, 4);
  return (
    <span className="ml-1 flex shrink-0 items-center">
      {shown.map((r, i) => (
        <span
          className={cn(i > 0 && "-ml-1.5")}
          key={r.url}
          style={{ zIndex: shown.length - i }}
        >
          <SiteIcon
            className="bg-background size-3.5 shrink-0 rounded-full ring-1 ring-background"
            result={r}
          />
        </span>
      ))}
    </span>
  );
}

/**
 * webSearch 的行内展示（替代 ai-elements 通用 Tool 组件）：
 * 搜索中 → 「搜索 query」；完成 → 「搜索到 N 个网页」+ favicon 叠加，点击打开右侧结果面板；
 * 失败 → 灰态不可点击。同一消息多次搜索各持各的 toolCallId，互不干扰。
 */
export function WebSearchToolView({
  threadId,
  part,
}: {
  threadId: string;
  part: WebSearchToolPartView;
}) {
  const openPanel = useSearchPanelStore((s) => s.openPanel);
  const activePanel = useSearchPanelStore((s) => s.panel);
  const query = part.input?.query?.trim() ?? "";

  if (part.state === "output-available") {
    const results = part.output?.results ?? [];
    const isActive =
      activePanel?.toolCallId === part.toolCallId && activePanel.threadId === threadId;
    return (
      <button
        className={cn(
          "hover:bg-accent text-muted-foreground flex w-fit max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:cursor-pointer",
          isActive && "bg-accent",
        )}
        onClick={() =>
          openPanel({ threadId, toolCallId: part.toolCallId, query, results })
        }
        type="button"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate">
          搜索到 <span className="text-foreground font-medium">{results.length}</span>{" "}
          个网页
        </span>
        <FaviconStack results={results} />
      </button>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-sm">
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate">搜索失败：{part.errorText ?? "未知错误"}</span>
      </div>
    );
  }

  // input-streaming / input-available：执行中
  return (
    <div className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-sm">
      <SearchIcon className="size-4 shrink-0 animate-pulse" />
      <span className="truncate">
        搜索 <span className="text-foreground font-medium">{query || "…"}</span>
      </span>
    </div>
  );
}
