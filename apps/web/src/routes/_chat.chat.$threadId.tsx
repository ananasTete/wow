import { createFileRoute } from "@tanstack/react-router";

/**
 * /chat/:threadId = 打开对应会话（threadId 由布局从 URL 读取并查询内容）。UI 由 _chat 布局渲染，此处仅占位。
 * 归属校验（不存在/非本人统一 404）由 ChatScreen 的消息查询承担：原地渲染"会话不存在"空态，不跳转——
 * URL 如实反映所指向会话的状态；服务端边界仍在 /api/* 的 userId 过滤。
 */
export const Route = createFileRoute("/_chat/chat/$threadId")({
  component: () => null,
});
