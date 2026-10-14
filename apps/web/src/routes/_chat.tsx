import { createFileRoute, redirect } from "@tanstack/react-router";
import { authKeys, fetchMe } from "#/features/auth";
import { ChatShell } from "#/features/chat";

/**
 * 无路径布局：/ 与 /chat/:id 的 UI（侧边栏 + 对话区）全部由 ChatShell 渲染，
 * ChatScreen 实例跨路由存活——首条消息 / → /chat/:id 切换时流式状态不丢、不重拉历史。
 *
 * beforeLoad 是登录守卫（未登录 → /login?next=当前完整路径）。
 * 注意 SPA 守卫只管体验，真正的安全边界是 /api/* 中间件的 401。
 */
export const Route = createFileRoute("/_chat")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient
      .fetchQuery({
        queryKey: authKeys.me(),
        queryFn: fetchMe,
        staleTime: 5 * 60_000, // 与 useSession 对齐：5 分钟内重复导航不重探
        retry: false, // 401 = 未登录，不值得重试
      })
      .catch(() => null);
    if (!me) {
      // location.href 含 search（如 /chat/abc?x=1），登录后可完整回到原地
      throw redirect({ to: "/login", search: { next: location.href } });
    }
  },
  component: ChatShell,
});
