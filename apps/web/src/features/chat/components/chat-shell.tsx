import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatScreen, useChatStore } from "#/features/chat";
import { ThreadSidebar } from "#/features/threads";

import { SearchResultsPanel } from "./search-results-panel";

/**
 * 应用主布局（由 _chat 路由挂载，跨 / 与 /chat/:id 常驻）：
 * 左侧会话目录 + 右侧对话。会话真源是 URL——/ 即新对话（草稿 id），/chat/:id 打开已有会话。
 */
export function ChatShell() {
  const urlThreadId = useParams({ strict: false }).threadId ?? null;
  const draftThreadId = useChatStore((s) => s.draftThreadId);
  const consumeDraft = useChatStore((s) => s.consumeDraft);

  // 草稿已随首条消息落库（URL 进入 /chat/:id 且等于草稿）时轮换：
  // 放在 effect 里保证先按新 URL 渲染（key 稳定不 remount），再换掉草稿
  useEffect(() => {
    if (urlThreadId) consumeDraft(urlThreadId);
  }, [urlThreadId, consumeDraft]);

  // URL 有 id 用 URL 的（key 稳定：草稿首发切到 /chat/:id 前后 threadId 不变，流式对话不中断）
  const threadId = urlThreadId ?? draftThreadId;
  const isDraft = urlThreadId === null;

  return (
    <div className="bg-background flex h-svh">
      <ThreadSidebar />
      <main className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatScreen isDraft={isDraft} key={threadId} threadId={threadId} />
        </div>
        <SearchResultsPanel threadId={threadId} />
      </main>
    </div>
  );
}
