export const queryKeys = {
  all: ["about"] as const,
  lists: () => [...queryKeys.all, "list"] as const,
  detail: (id: string) => [...queryKeys.all, "detail", id] as const,
};
