import { LogOutIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useSignOut } from "#/features/auth";
import { useChatStore } from "#/features/chat/store";
import { cn } from "#/lib/utils";

import { useThreadList } from "../hooks/use-thread-list";
import { ThreadListItem } from "./thread-list-item";

const PAGE_SIZE = 20;

/**
 * 左侧会话目录（ChatGPT 式）：新建 + 无限滚动列表 + 登出。
 */
export function ThreadSidebar({ className }: { className?: string }) {
  const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useThreadList(PAGE_SIZE);
  const signOut = useSignOut();
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const startNewThread = useChatStore((s) => s.startNewThread);
  const selectThread = useChatStore((s) => s.selectThread);

  // 无限滚动：列表容器触底加载下一页
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const threads = data?.pages.flatMap((p) => p.items) ?? [];
  // 置顶段全量随每页返回，取首页即可（后续页为同数据的重复快照）
  const pinned = data?.pages[0]?.pinned ?? [];

  return (
    <aside
      className={cn("bg-muted/40 flex h-full w-64 shrink-0 flex-col border-r", className)}
    >
      <div className="flex items-center justify-between p-2">
        <span className="px-2 font-semibold">wow</span>
        <Button
          aria-label="退出登录"
          onClick={() => signOut.mutate()}
          size="icon-sm"
          variant="ghost"
        >
          <LogOutIcon className="size-4" />
        </Button>
      </div>

      <div className="px-2 pb-2">
        <Button
          className="w-full justify-start gap-2"
          onClick={startNewThread}
          variant="outline"
        >
          <PlusIcon className="size-4" />
          新建对话
        </Button>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {isPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-muted-foreground size-5" />
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <p className="px-2 pt-2 pb-1 text-muted-foreground text-xs font-medium">
                  已置顶
                </p>
                {pinned.map((t) => (
                  <ThreadListItem
                    active={t.id === activeThreadId}
                    key={t.id}
                    onDeleted={(id) => {
                      if (id === activeThreadId) selectThread(null);
                    }}
                    onSelect={selectThread}
                    thread={t}
                  />
                ))}
                <p className="px-2 pt-3 pb-1 text-muted-foreground text-xs font-medium">
                  会话
                </p>
              </>
            )}
            {threads.map((t) => (
              <ThreadListItem
                active={t.id === activeThreadId}
                key={t.id}
                onDeleted={(id) => {
                  if (id === activeThreadId) selectThread(null);
                }}
                onSelect={selectThread}
                thread={t}
              />
            ))}
            <div ref={sentinelRef} />
            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Spinner className="text-muted-foreground size-4" />
              </div>
            )}
            {!hasNextPage && threads.length > 0 && (
              <p className="py-3 text-center text-muted-foreground text-xs">
                共 {pinned.length + threads.length} 个会话
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
