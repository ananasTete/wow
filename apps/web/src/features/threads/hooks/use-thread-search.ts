import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { searchThreads } from "../api";
import { threadKeys } from "../query-keys";

/** 会话全局搜索：q 为空时不发请求；keepPreviousData 让连续输入不闪空态 */
export function useThreadSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: threadKeys.search(q),
    queryFn: () => searchThreads(q),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
