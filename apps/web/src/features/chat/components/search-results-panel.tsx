import { XIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { useSearchPanelStore } from "../search-panel-store";
import { SearchResultItem } from "./citation-tag";

/**
 * 搜索结果侧边栏：与会话面板并列（非悬浮）。
 * 渲染前提：面板快照存在且属于当前会话（threadId 由 ChatShell 传入）——切换会话即自动失效。
 * 窄屏（<md）不显示（flex 布局会挤压会话区），后续需要时再加移动端抽屉。
 */
export function SearchResultsPanel({ threadId }: { threadId: string }) {
  const panel = useSearchPanelStore((s) => s.panel);
  const closePanel = useSearchPanelStore((s) => s.closePanel);

  if (!panel || panel.threadId !== threadId) return null;

  return (
    <aside className="bg-background hidden w-80 shrink-0 flex-col border-l md:flex">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <h2 className="text-sm font-medium">搜索结果</h2>
        <Button
          aria-label="关闭搜索结果"
          onClick={closePanel}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-muted-foreground mb-3 truncate border-b pb-3 text-xs">
          {panel.query}
        </p>
        <div className="flex flex-col">
          {panel.results.map((r) => (
            <div
              className="border-b py-3 first:pt-1 last:border-b-0 last:pb-0"
              key={r.url}
            >
              <SearchResultItem result={r} />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
