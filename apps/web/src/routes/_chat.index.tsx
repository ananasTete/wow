import { createFileRoute } from "@tanstack/react-router";
import { ThreadNotice } from "#/features/threads/components/thread-notice";

/**
 * / = 新对话（草稿模式，首条消息时创建会话并切换到 /chat/:id）。UI 由 _chat 布局渲染，此处仅占位。
 * notice：跨路由通知参数（如会话 404 守卫重定向带回），由 ThreadNotice 弹 toast 后从 URL 清除。
 */
export const Route = createFileRoute("/_chat/")({
  // 键声明为可选：既有 to="/" 导航/链接不需要显式传 search
  validateSearch: (s: Record<string, unknown>): { notice?: string } => ({
    notice: typeof s.notice === "string" ? s.notice : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <ThreadNotice notice={Route.useSearch().notice} />;
}
