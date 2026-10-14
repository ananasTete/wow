import { createFileRoute, redirect } from "@tanstack/react-router";
import { authKeys, fetchSessionExists, LoginPage, safeNext } from "#/features/auth";

/**
 * 登录页路由。
 * - next：登录成功后的回跳目标（守卫重定向时带上），仅接受站内相对路径（防开放重定向）
 * - 反向守卫：已登录用户不该看到登录表单，直接跳 next / 主页。
 *   探测走 better-auth 原生 /auth/get-session（不经 /api/*，不会误触发 401 拦截器）
 */
export const Route = createFileRoute("/login")({
  // 键声明为可选：search 参数整体才可选，未带 next 的导航/链接不需要显式传 search
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    const sessionExists = await context.queryClient
      .fetchQuery({
        queryKey: authKeys.sessionProbe(),
        queryFn: fetchSessionExists,
        staleTime: 0, // 每次进登录页都现探一次，避免拿旧缓存误判
        retry: false,
      })
      .catch(() => false);
    if (sessionExists) {
      throw redirect({ href: safeNext(search.next) });
    }
  },
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  return <LoginPage next={Route.useSearch().next} />;
}
