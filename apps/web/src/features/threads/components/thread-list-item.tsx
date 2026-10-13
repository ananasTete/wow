import type { ThreadSummary } from "@wow/shared";
import {
  MessageSquareIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
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
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(thread.title);
  const pinned = thread.pinnedAt !== null;

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
    // biome-ignore lint/a11y/useSemanticElements: 行内嵌套按钮组（置顶/重命名/删除），button 套 button 非法，保持 div + 显式键盘处理
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
        "hover:bg-accent cursor-pointer transition-colors",
        active && "bg-accent",
      )}
      onClick={() => !editing && onSelect(thread.id)}
      onDoubleClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !editing) onSelect(thread.id);
      }}
      role="button"
      tabIndex={0}
    >
      <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
      {editing ? (
        <input
          className="bg-background w-full rounded-md px-1 py-0.5 text-sm outline-none ring-1 ring-ring"
          onBlur={commitRename}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraftTitle(thread.title);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          value={draftTitle}
        />
      ) : (
        <span className="w-full truncate">{thread.title}</span>
      )}
      {!editing && (
        <div className="hidden shrink-0 gap-0.5 group-hover:flex">
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
          <Button
            aria-label="重命名"
            onClick={(e) => {
              e.stopPropagation();
              setDraftTitle(thread.title);
              setEditing(true);
            }}
            size="icon-sm"
            variant="ghost"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="删除"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`删除会话「${thread.title}」？`)) {
                remove.mutate(thread.id);
                onDeleted?.(thread.id);
              }
            }}
            size="icon-sm"
            variant="ghost"
          >
            <Trash2Icon className="text-destructive size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
