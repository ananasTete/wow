import { Link } from "@tanstack/react-router";
import { CircleAlertIcon, ShieldAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";

/** 错误码 → 展示标题（errorText 是错误对象 JSON.stringify 后的字符串） */
const ERROR_TITLES: Record<string, string> = {
  "1301": "内容安全审查未通过",
  NOT_FOUND: "会话不存在或已被删除",
};

interface ParsedError {
  title: string;
  description: string;
  code: string;
}

function parseStreamError(error: Error): ParsedError {
  try {
    const parsed = JSON.parse(error.message) as {
      message?: unknown;
      code?: unknown;
    };
    if (typeof parsed.message === "string" && parsed.message) {
      const code = String(parsed.code ?? "");
      return {
        title: ERROR_TITLES[code] ?? "请求出错",
        description: parsed.message,
        code,
      };
    }
  } catch {
    // errorText 不是 JSON（如网络错误），原样展示
  }
  return {
    title: "请求出错",
    description: error.message || "出错了，请稍后重试",
    code: /not_found/i.test(error.message) ? "NOT_FOUND" : "",
  };
}

/** useChat 出错时的提示条：透传服务端真实错误信息，不猜原因；会话被删（404）时给返回主页出口 */
export function ChatErrorAlert({ error }: { error: Error }) {
  const { title, description, code } = parseStreamError(error);
  const Icon = code === "1301" ? ShieldAlertIcon : CircleAlertIcon;
  return (
    <Alert variant="destructive" className="my-2">
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {code === "NOT_FOUND" && (
          <Button asChild size="xs" variant="outline">
            <Link to="/">返回主页</Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
