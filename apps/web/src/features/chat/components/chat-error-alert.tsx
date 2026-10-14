import { CircleAlertIcon, ShieldAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";

/** provider 错误码 → 展示标题（errorText 是错误对象 JSON.stringify 后的字符串） */
const ERROR_TITLES: Record<string, string> = {
  "1301": "内容安全审查未通过",
};

interface ParsedError {
  title: string;
  description: string;
  /** 命中已知错误码（如敏感内容拦截），换更贴切的图标 */
  known: boolean;
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
        known: code in ERROR_TITLES,
      };
    }
  } catch {
    // errorText 不是 JSON（如网络错误），原样展示
  }
  return {
    title: "请求出错",
    description: error.message || "出错了，请稍后重试",
    known: false,
  };
}

/** useChat 出错时的提示条：透传服务端真实错误信息，不猜原因 */
export function ChatErrorAlert({ error }: { error: Error }) {
  const { title, description, known } = parseStreamError(error);
  const Icon = known ? ShieldAlertIcon : CircleAlertIcon;
  return (
    <Alert variant="destructive" className="my-2">
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
