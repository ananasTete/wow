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
    onSuccess: async () => {
      // 必须先导航再清缓存：clear() 时侧栏的 threads/me 查询 observer 仍挂载，
      // react-query 会在组件下一次渲染时重建空 query 并立刻重发请求（登出后必 401）。
      // navigate 的 promise 在新路由渲染完成（旧组件卸载）后才 resolve，此时清缓存才无副作用。
      // 显式不带 next：登出后不应回跳原会话（靠守卫重定向会带上 next，语义不对）
      await navigate({ to: "/login" });
      qc.clear(); // 登出清空全部缓存（会话/会话列表都不可再见）
    },
  });
}
