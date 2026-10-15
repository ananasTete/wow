import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ThreadDetail } from "@wow/shared";

import { deleteThread, updateThread } from "../api";
import { moveToPinned, removeThread, upsertTop } from "../lib/thread-list-cache";
import { threadKeys } from "../query-keys";

/** 更新会话：重命名 / 置顶 / 取消置顶。列表不再请求——onSuccess 用服务端返回的
 * summary（updatedAt/pinnedAt 已是服务端真相）直接做缓存手术：置顶进置顶段，
 * 其余（重命名/取消置顶都会刷新 updatedAt）回普通段顶部。详情合并保持原有逻辑。 */
export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; title?: string; pinned?: boolean }) =>
      updateThread(id, patch),
    onSuccess: (updated) => {
      if (updated.pinnedAt != null) {
        moveToPinned(qc, updated);
      } else {
        upsertTop(qc, updated);
      }
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
      // 列表直接摘除（keyset 下删除不影响后续取页），不发列表请求
      removeThread(qc, id);
      // 详情查询的 observer（ChatScreen）此刻往往仍挂载（导航在 mutate onSuccess 里才发出），
      // 默认 invalidate 会立即触发活跃 observer refetch，对已删除会话多发一次必 404 的 GET。
      // refetchType "none" 只标记 stale 不重取：无多余请求；将来再进该 URL 时新 observer
      // 挂载会重新请求，404 由 ChatScreen 承接为原地空态
      qc.invalidateQueries({ queryKey: threadKeys.detail(id), refetchType: "none" });
    },
  });
}
