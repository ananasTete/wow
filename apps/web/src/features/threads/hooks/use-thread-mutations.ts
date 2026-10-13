import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteThread, updateThread } from "../api";
import { threadKeys } from "../query-keys";

/** 更新会话：重命名 / 置顶 / 取消置顶（操作后列表重新分组，需整段失效） */
export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; title?: string; pinned?: boolean }) =>
      updateThread(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: threadKeys.lists() }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteThread(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: threadKeys.lists() }),
  });
}
