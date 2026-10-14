import { useNavigate, useParams } from "@tanstack/react-router";
import {
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  SquarePenIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Spinner } from "#/components/ui/spinner";
import { useSession, useSignOut } from "#/features/auth";
import { useChatStore } from "#/features/chat/store";
import { cn } from "#/lib/utils";

import { useThreadList } from "../hooks/use-thread-list";
import { ThreadListItem } from "./thread-list-item";
import { ThreadSearchDialog } from "./thread-search-dialog";

const PAGE_SIZE = 20;

/**
 * 左侧会话目录（ChatGPT 式）：新建 + 无限滚动列表 + 底部用户区，可收起为图标栏。
 */
export function ThreadSidebar({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const urlThreadId = useParams({ strict: false }).threadId ?? null;
  const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useThreadList(PAGE_SIZE);
  const { data: me } = useSession();
  const signOut = useSignOut();
  const startNewThread = useChatStore((s) => s.startNewThread);
  const openThread = (id: string) =>
    navigate({ to: "/chat/$threadId", params: { threadId: id } });

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
  const initial = (me?.name || me?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "bg-muted/40 flex h-full shrink-0 flex-col border-r transition-[width] duration-200",
        collapsed ? "w-14" : "w-64",
        className,
      )}
    >
      {/* 展开态：品牌 + 收起/搜索按钮，收起时淡出；收起态：居中展开按钮淡入。
          两按钮交叉过渡，隐藏侧 pointer-events-none + tabIndex -1 不参与交互 */}
      <div className="relative flex items-center justify-between px-2 pt-2">
        <span
          className={cn(
            "flex-1 truncate px-2 font-semibold",
            collapsed ? "opacity-0" : "opacity-100 transition-opacity duration-200",
          )}
        >
          wow
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            aria-label="搜索会话"
            className={cn(
              collapsed
                ? "pointer-events-none opacity-0"
                : "opacity-100 transition-opacity duration-200",
            )}
            onClick={() => setSearchOpen(true)}
            size="icon-sm"
            tabIndex={collapsed ? -1 : 0}
            variant="ghost"
          >
            <SearchIcon className="size-4" />
          </Button>
          <Button
            aria-label="收起侧边栏"
            className={cn(
              collapsed
                ? "pointer-events-none opacity-0"
                : "opacity-100 transition-opacity duration-200",
            )}
            onClick={() => setCollapsed(true)}
            size="icon-sm"
            tabIndex={collapsed ? -1 : 0}
            variant="ghost"
          >
            <PanelLeftCloseIcon className="size-4" />
          </Button>
        </div>
        <Button
          aria-label="展开侧边栏"
          className={cn(
            "absolute left-3",
            collapsed
              ? "opacity-100 transition-opacity duration-200"
              : "pointer-events-none opacity-0",
          )}
          onClick={() => setCollapsed(false)}
          size="icon-sm"
          tabIndex={collapsed ? 0 : -1}
          variant="ghost"
        >
          <PanelLeftOpenIcon className="size-4" />
        </Button>
      </div>

      {/* 新建区上下各留 16px：与 header、与列表间距一致（header 不含底部内边距）；后续这里还会加更多操作项 */}
      <div className="px-2 pt-4 pb-4">
        {/* 图标位置两种状态一致（收起只淡出文字），收展过程无跳动 */}
        <Button
          className="w-full justify-start gap-2 overflow-hidden"
          onClick={() => {
            startNewThread();
            navigate({ to: "/" });
          }}
          variant="ghost"
        >
          <SquarePenIcon className="size-4 shrink-0" />
          <span
            className={cn(
              "truncate",
              collapsed ? "opacity-0" : "opacity-100 transition-opacity duration-200",
            )}
          >
            新建对话
          </span>
        </Button>
      </div>

      {collapsed ? (
        <div className="flex-1" />
      ) : (
        <div className="animate-in fade-in flex-1 space-y-0.5 overflow-y-auto px-2 pb-4 duration-200">
          {isPending ? (
            <div className="flex justify-center py-8">
              <Spinner className="text-muted-foreground size-5" />
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <p className="px-2 pt-2 pb-1 text-muted-foreground text-xs font-medium whitespace-nowrap">
                    已置顶
                  </p>
                  {pinned.map((t) => (
                    <ThreadListItem
                      active={t.id === urlThreadId}
                      key={t.id}
                      onDeleted={(id) => {
                        if (id === urlThreadId) navigate({ to: "/" });
                      }}
                      onSelect={openThread}
                      thread={t}
                    />
                  ))}
                  <p className="px-2 pt-3 pb-1 text-muted-foreground text-xs font-medium whitespace-nowrap">
                    会话
                  </p>
                </>
              )}
              {threads.map((t) => (
                <ThreadListItem
                  active={t.id === urlThreadId}
                  key={t.id}
                  onDeleted={(id) => {
                    if (id === urlThreadId) navigate({ to: "/" });
                  }}
                  onSelect={openThread}
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
                <p className="text-muted-foreground py-3 text-center text-xs whitespace-nowrap">
                  共 {pinned.length + threads.length} 个会话
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="hover:bg-accent flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2 py-1.5 transition-colors"
              type="button"
            >
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase">
                {initial}
              </span>
              {me && (
                <span
                  className={cn(
                    "min-w-0 flex-1 text-left",
                    collapsed
                      ? "opacity-0"
                      : "opacity-100 transition-opacity duration-200",
                  )}
                >
                  <span className="block truncate text-sm font-medium">{me.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {me.email}
                  </span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48" side="top">
            <DropdownMenuItem onSelect={() => signOut.mutate()} variant="destructive">
              <LogOutIcon className="size-4" /> 退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ThreadSearchDialog
        onOpenChange={setSearchOpen}
        onSelect={openThread}
        open={searchOpen}
      />
    </aside>
  );
}
