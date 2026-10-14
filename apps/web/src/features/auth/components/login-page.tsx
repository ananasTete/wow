import { useNavigate } from "@tanstack/react-router";
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
import { useSignIn, useSignUp } from "../hooks/use-session";
import { safeNext } from "../lib/safe-next";

/**
 * 登录页（/login）：登录/注册双模式表单。
 * 登录成功跳回 next（守卫带来的来源路径，防开放重定向后回原处），无 next 回主页。
 */
export function LoginPage({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();

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
          <AuthForm
            mode={mode}
            onSuccess={() => void navigate({ href: safeNext(next) })}
          />
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

function AuthForm({
  mode,
  onSuccess,
}: {
  mode: "signin" | "signup";
  onSuccess: () => void;
}) {
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
        const options = { onSuccess };
        if (mode === "signin") {
          signIn.mutate({ email, password }, options);
        } else {
          signUp.mutate({ name, email, password }, options);
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
