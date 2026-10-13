import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchAboutDetail } from "../api";
import { queryKeys } from "../query-keys";

export const aboutDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchAboutDetail(id),
  });

export function useAboutDetail(id: string) {
  return useQuery(aboutDetailQueryOptions(id));
}
