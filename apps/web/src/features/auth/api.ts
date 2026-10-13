import { api } from "#/lib/axios";

export interface Me {
  id: string;
  email: string;
  name: string;
}

/** better-auth email/password 登录（cookie 会话） */
export async function signIn(email: string, password: string) {
  await api.post("/auth/sign-in/email", { email, password });
}

export async function signUp(name: string, email: string, password: string) {
  await api.post("/auth/sign-up/email", { name, email, password });
}

export async function signOut() {
  await api.post("/auth/sign-out");
}

export async function fetchMe(): Promise<Me> {
  return api.get<unknown, Me>("/api/me");
}
