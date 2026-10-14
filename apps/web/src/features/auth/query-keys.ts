export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  sessionProbe: () => [...authKeys.all, "session-exists"] as const,
};
