import { useNavigate } from "@tanstack/react-router";
import { EllipsisIcon, PencilIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { DeleteThreadDialog } from "#/features/threads/components/delete-thread-dialog";
import { useUpdateThread } from "#/features/threads/hooks/use-thread-mutations";

/**
 * 右侧消息面板 header：标题（单击进入编辑，Enter 提交，blur/Esc 只退出不提交）+
 * 更多菜单（重命名 / 置顶 / 删除，删除确认弹窗与侧栏共用）。标题与置顶态由父级从会话详情查询传入。
 */
interface ChatHeaderProps {
  threadId: string;
  title: string;
  pinned: boolean;
}

export function ChatHeader({ threadId, title, pinned }: ChatHeaderProps) {
  const update = useUpdateThread();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // 进入编辑即聚焦并全选（autoFocus 被 a11y 规则禁用，改为显式聚焦）
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startRename = () => {
    setDraftTitle(title);
    setEditing(true);
  };

  const exitEditing = () => setEditing(false);

  const commitRename = () => {
    setEditing(false);
    const next = draftTitle.trim();
    if (next && next !== title) update.mutate({ id: threadId, title: next });
  };

  return (
    <header className="flex h-12 w-full shrink-0 items-center gap-1 px-4">
      {editing ? (
        <input
          className="bg-background field-sizing-content max-w-[60%] rounded-md px-2 py-1 text-sm font-medium outline-none ring-1 ring-ring"
          onBlur={exitEditing}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") exitEditing();
          }}
          ref={inputRef}
          value={draftTitle}
        />
      ) : (
        <button
          className="hover:bg-accent max-w-[60%] shrink-0 cursor-pointer truncate rounded-md px-2 py-1 text-left text-sm font-medium transition-colors"
          onClick={startRename}
          title={title}
          type="button"
        >
          {title}
        </button>
      )}
      {!editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="更多操作"
              className="ml-auto shrink-0"
              size="icon-sm"
              variant="ghost"
            >
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={startRename}>
              <PencilIcon className="size-4" /> 重命名
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => update.mutate({ id: threadId, pinned: !pinned })}
            >
              {pinned ? (
                <PinOffIcon className="size-4" />
              ) : (
                <PinIcon className="size-4" />
              )}
              {pinned ? "取消置顶" : "置顶"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDeleteOpen(true)} variant="destructive">
              <Trash2Icon className="size-4" /> 删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DeleteThreadDialog
        onDeleted={() => void navigate({ to: "/" })}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        threadId={threadId}
        title={title}
      />
    </header>
  );
}
