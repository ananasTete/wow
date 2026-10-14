import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useToastStore } from "#/stores/toast";

const NOTICES: Record<string, { title: string; description: string }> = {
  thread_not_found: {
    title: "会话不存在或已被删除",
    description: "链接可能已失效，或该会话已被移除",
  },
};

/**
 * 读 /?notice=xxx 的跨路由通知：弹 toast 后立刻把参数从 URL 清除。
 * 纯 URL 驱动（可分享/可刷新），不依赖全局 store 传递时序。
 * 渲染输出为 null，不参与布局。
 */
export function ThreadNotice({ notice }: { notice?: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!notice) return;
    const text = NOTICES[notice];
    if (text) {
      useToastStore.getState().push({ ...text, variant: "destructive" });
    }
    void navigate({ to: "/", search: {}, replace: true });
  }, [notice, navigate]);

  return null;
}
