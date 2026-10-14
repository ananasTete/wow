import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { fetchMe, signIn, signOut, signUp } from "../api";
import { authKeys } from "../query-keys";

export function useSession() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchMe,
    retry: false, // 401 视为未登录，不重试
    staleTime: 5 * 60_000,
  });
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useSignUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => signUp(name, email, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => signOut(),
    onSuccess: () => {
      qc.clear(); // 登出清空全部缓存（会话/会话列表都不可再见）
      // 显式导航且不带 next：登出后不应回跳原会话（靠守卫重定向会带上 next，语义不对）
      void navigate({ to: "/login" });
    },
  });
}
