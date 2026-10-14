import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "#/features/auth";
import { ChatShell } from "#/features/chat";

/**
 * 无路径布局：/ 与 /chat/:id 的 UI（侧边栏 + 对话区）全部由 ChatShell 渲染，
 * ChatScreen 实例跨路由存活——首条消息 / → /chat/:id 切换时流式状态不丢、不重拉历史。
 */
export const Route = createFileRoute("/_chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <AuthGate>
      <ChatShell />
    </AuthGate>
  );
}
