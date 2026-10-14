import { useQueryClient } from "@tanstack/react-query";
import type { ThreadSummary } from "@wow/shared";
import { EllipsisIcon, PencilIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { fetchThreadMessages } from "#/features/chat/api";
import { chatKeys } from "#/features/chat/query-keys";
import { cn } from "#/lib/utils";

import { useDeleteThread, useUpdateThread } from "../hooks/use-thread-mutations";

interface ThreadListItemProps {
  thread: ThreadSummary;
  active: boolean;
  onSelect: (id: string) => void;
  /** 删除的是当前打开的会话时，由父级清空 active */
  onDeleted?: (id: string) => void;
}

export function ThreadListItem({
  thread,
  active,
  onSelect,
  onDeleted,
}: ThreadListItemProps) {
  const update = useUpdateThread();
  const remove = useDeleteThread();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(thread.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const pinned = thread.pinnedAt !== null;

  // 预取该会话消息（staleTime 与页面查询一致）：命中缓存后点击进入即时渲染
  const prefetchMessages = useCallback(() => {
    void qc.prefetchQuery({
      queryKey: chatKeys.messages(thread.id),
      queryFn: () => fetchThreadMessages(thread.id),
      staleTime: Infinity,
    });
  }, [qc, thread.id]);

  // hover 停留防抖后才预取：鼠标快速划过列表不触发请求（生产环境省带宽与后端 QPS）；
  // 键盘 Tab 聚焦不存在扫射问题，保持立即预取
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelScheduledPrefetch = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);
  const schedulePrefetch = useCallback(() => {
    cancelScheduledPrefetch();
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      prefetchMessages();
    }, 250);
  }, [cancelScheduledPrefetch, prefetchMessages]);

  // 卸载时清掉未触发的预取定时器
  useEffect(() => cancelScheduledPrefetch, [cancelScheduledPrefetch]);

  // 进入重命名即聚焦（autoFocus 被 a11y 规则禁用，改为显式聚焦）
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startRename = () => {
    setDraftTitle(thread.title);
    setEditing(true);
  };

  const commitRename = () => {
    setEditing(false);
    const title = draftTitle.trim();
    if (title && title !== thread.title) {
      update.mutate({ id: thread.id, title });
    } else {
      setDraftTitle(thread.title);
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: 行内嵌套按钮/菜单触发器（置顶、更多），button 套 button 非法，保持 div + 显式键盘处理
    <div
      className={cn(
        // 固定 h-9：右侧操作按钮（size-8）hover 显隐不再撑高行，避免列表闪动
        "group hover:bg-accent flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm transition-colors",
        active && "bg-accent",
      )}
      onClick={() => !editing && onSelect(thread.id)}
      onDoubleClick={startRename}
      onFocus={prefetchMessages}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !editing) onSelect(thread.id);
      }}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelScheduledPrefetch}
      role="button"
      tabIndex={0}
    >
      {editing ? (
        <input
          className="bg-background w-full rounded-md px-1 py-0.5 text-sm outline-none ring-1 ring-ring"
          onBlur={commitRename}
          onChange={(e) => setDraftTitle(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraftTitle(thread.title);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          ref={inputRef}
          value={draftTitle}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{thread.title}</span>
      )}
      {!editing && (
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex focus-within:flex has-data-[state=open]:flex">
          <Button
            aria-label={pinned ? "取消置顶" : "置顶"}
            onClick={(e) => {
              e.stopPropagation();
              update.mutate({ id: thread.id, pinned: !pinned });
            }}
            size="icon-sm"
            variant="ghost"
          >
            {pinned ? (
              <PinOffIcon className="size-3.5" />
            ) : (
              <PinIcon className="size-3.5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="更多操作"
                onClick={(e) => e.stopPropagation()}
                size="icon-sm"
                variant="ghost"
              >
                <EllipsisIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onSelect={startRename}>
                <PencilIcon className="size-4" /> 重命名
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  if (window.confirm(`删除会话「${thread.title}」？`)) {
                    remove.mutate(thread.id);
                    onDeleted?.(thread.id);
                  }
                }}
                variant="destructive"
              >
                <Trash2Icon className="size-4" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
