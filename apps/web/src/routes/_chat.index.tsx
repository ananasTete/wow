import { createFileRoute } from "@tanstack/react-router";

/** / = 新对话（草稿模式，首条消息时创建会话并切换到 /chat/:id）。UI 由 _chat 布局渲染，此处仅占位 */
export const Route = createFileRoute("/_chat/")({
  component: () => null,
});
