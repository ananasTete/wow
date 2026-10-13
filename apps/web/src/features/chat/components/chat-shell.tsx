import { SparklesIcon } from "lucide-react";
import { ChatScreen, useChatStore } from "#/features/chat";
import { ThreadSidebar } from "#/features/threads";

/**
 * 应用主布局：左侧会话目录 + 右侧对话（ChatGPT 式结构）。
 */
export function ChatShell() {
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const startNewThread = useChatStore((s) => s.startNewThread);

  return (
    <div className="bg-background flex h-svh">
      <ThreadSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {activeThreadId ? (
          <ChatScreen key={activeThreadId} threadId={activeThreadId} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <SparklesIcon className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-lg">开始一段新对话</p>
            <button
              className="text-primary underline-offset-4 hover:underline"
              onClick={startNewThread}
              type="button"
            >
              新建对话
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
