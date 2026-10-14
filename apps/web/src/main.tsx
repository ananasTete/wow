import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { Spinner } from "#/components/ui/spinner";
import { setSessionExpiredHandler } from "#/lib/session-expired";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

/** 路由 beforeLoad（登录守卫/登录页探测）期间的全屏等待态 */
function RoutePending() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}

const router = createRouter({
  routeTree,
  // queryClient 进路由 context：beforeLoad 守卫用 fetchQuery 共享会话缓存
  context: { queryClient },
  scrollRestoration: true,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: RoutePending,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// 会话过期（/api/* 401，axios 拦截器上报）：清缓存 + 带当前路径回登录页。
// 已在 /login 时忽略（登录页自己的探测请求失败不该再触发跳转）。
// 与 useSignOut 同序：先导航（promise 在旧路由卸载后才 resolve）再清缓存，
// 否则 clear() 会让仍挂载的查询 observer 立刻重建空 query 并重发请求（401 风暴）。
setSessionExpiredHandler((href) => {
  if (router.state.location.pathname === "/login") return;
  void router.navigate({ to: "/login", search: { next: href } }).then(() => {
    queryClient.clear();
  });
});

const rootElement = document.getElementById("app");

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
