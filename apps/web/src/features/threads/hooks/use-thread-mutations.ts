import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ThreadDetail } from "@wow/shared";

import { deleteThread, updateThread } from "../api";
import { threadKeys } from "../query-keys";

/** 更新会话：重命名 / 置顶 / 取消置顶（列表重新分组 + 详情页 header 同步，需双失效） */
export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; title?: string; pinned?: boolean }) =>
      updateThread(id, patch),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: threadKeys.lists() });
      qc.setQueryData<ThreadDetail>(threadKeys.detail(updated.id), (old) =>
        old ? { ...old, ...updated } : old,
      );
    },
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteThread(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: threadKeys.lists() });
      // 详情查询的 observer（ChatScreen）此刻往往仍挂载（导航在 mutate onSuccess 里才发出），
      // 默认 invalidate 会立即触发活跃 observer refetch，对已删除会话多发一次必 404 的 GET。
      // refetchType "none" 只标记 stale 不重取：无多余请求；将来再进该 URL 时新 observer
      // 挂载会重新请求，404 由 ChatScreen 承接为原地空态
      qc.invalidateQueries({ queryKey: threadKeys.detail(id), refetchType: "none" });
    },
  });
}
