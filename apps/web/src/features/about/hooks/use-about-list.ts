import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchAboutList } from "../api";
import { queryKeys } from "../query-keys";

export const aboutListQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.lists(),
    queryFn: fetchAboutList,
  });

export function useAboutList() {
  return useQuery(aboutListQueryOptions());
}
