export const threadKeys = {
  all: ["threads"] as const,
  lists: () => [...threadKeys.all, "list"] as const,
  list: (limit: number) => [...threadKeys.lists(), limit] as const,
  search: (q: string) => [...threadKeys.all, "search", q] as const,
};
