import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { Button } from "#/components/ui/button";

import "../styles.css";

// queryClient 经 main.tsx 的 createRouter({ context }) 注入，
// 在根路由声明类型后，所有子路由 beforeLoad 的 context.queryClient 才有类型
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="font-bold text-6xl">404</h1>
      <p className="text-muted-foreground">页面不存在或已被移动</p>
      <Button asChild>
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}
