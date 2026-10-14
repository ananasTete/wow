import { createFileRoute } from "@tanstack/react-router";

/** /chat/:threadId = 打开对应会话（threadId 由布局从 URL 读取并查询内容）。UI 由 _chat 布局渲染，此处仅占位 */
export const Route = createFileRoute("/_chat/chat/$threadId")({
  component: () => null,
});
