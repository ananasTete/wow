import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";

import { authErrorMessage } from "../api";
import { useSession, useSignIn, useSignUp } from "../hooks/use-session";

/**
 * 登录门：未登录时展示登录/注册表单，已登录渲染 children。
 * 会话探测中显示全屏 loading。
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isPending, isError } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{mode === "signin" ? "欢迎回来" : "创建账号"}</CardTitle>
            <CardDescription>
              {mode === "signin" ? "登录后开始对话" : "注册一个新账号"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode={mode} />
            <Button
              className="mt-4 w-full"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              type="button"
              variant="ghost"
            >
              {mode === "signin" ? "没有账号？注册" : "已有账号？登录"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const signIn = useSignIn();
  const signUp = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const pending = signIn.isPending || signUp.isPending;
  const error = signIn.error || signUp.error;

  return (
    <form
      className={cn("space-y-3")}
      onSubmit={(e) => {
        e.preventDefault();
        if (mode === "signin") {
          signIn.mutate({ email, password });
        } else {
          signUp.mutate({ name, email, password });
        }
      }}
    >
      {mode === "signup" && (
        <Input
          onChange={(e) => setName(e.target.value)}
          placeholder="昵称"
          required
          value={name}
        />
      )}
      <Input
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        required
        type="email"
        value={email}
      />
      <Input
        minLength={8}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码（至少 8 位）"
        required
        type="password"
        value={password}
      />
      {error && <p className="text-destructive text-sm">{authErrorMessage(error)}</p>}
      <Button className="w-full" disabled={pending} type="submit">
        {pending && <Spinner className="size-4" />}
        {mode === "signin" ? "登录" : "注册"}
      </Button>
    </form>
  );
}
