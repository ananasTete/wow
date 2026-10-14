import { XIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { useToastStore } from "#/stores/toast";

/**
 * 全局 toast 渲染器（挂 __root，所有路由可见）。置顶居中展示，避开右下角 devtools。
 * 入场用 slide-in-from-top：贴边元素从底部滑入会把视口顶出滚动条。
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <Alert
          className="pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300"
          key={toast.id}
          variant={toast.variant ?? "default"}
        >
          <AlertTitle className="pr-6">{toast.title}</AlertTitle>
          {toast.description && <AlertDescription>{toast.description}</AlertDescription>}
          <Button
            aria-label="关闭"
            className="absolute top-1.5 right-1.5 size-6"
            onClick={() => dismiss(toast.id)}
            size="icon-xs"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
