import { createFileRoute, redirect } from "@tanstack/react-router";
import axios from "axios";
import { fetchThreadMessages } from "#/features/chat/api";
import { chatKeys } from "#/features/chat/query-keys";
import { useChatStore } from "#/features/chat/store";

/**
 * /chat/:threadId = 打开对应会话（threadId 由布局从 URL 读取并查询内容）。UI 由 _chat 布局渲染，此处仅占位。
 *
 * beforeLoad 做归属校验（提前预取消息，与 ChatScreen 同 queryKey 共享缓存）：
 * 不存在与非本人统一 404（防会话 ID 枚举）→ toast 通知 + 回主页（replace，死链不留历史栈）。
 */
export const Route = createFileRoute("/_chat/chat/$threadId")({
  // 守卫要整段预取会话消息，hover 预加载代价过高；点击时校验已足够快
  preload: false,
  beforeLoad: async ({ context, params }) => {
    // 草稿首发场景：threadId 即当前草稿 id（会话落库与导航并发），活动实例已接管渲染，跳过校验
    if (useChatStore.getState().draftThreadId === params.threadId) return;

    try {
      await context.queryClient.fetchQuery({
        queryKey: chatKeys.messages(params.threadId),
        queryFn: () => fetchThreadMessages(params.threadId),
        staleTime: Infinity, // 与 ChatScreen 对齐：历史只作初始消息
        retry: false,
      });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        throw redirect({
          to: "/",
          search: { notice: "thread_not_found" },
          replace: true,
        });
      }
      throw e;
    }
  },
  component: () => null,
});
