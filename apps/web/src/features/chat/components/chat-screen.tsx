import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { SparklesIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "#/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "#/components/ai-elements/prompt-input";
import { Spinner } from "#/components/ui/spinner";

import { threadKeys } from "#/features/threads/query-keys";

import { fetchThreadMessages } from "../api";
import { chatKeys } from "../query-keys";
import { MessageView } from "./message-view";

/**
 * 右侧对话主区：历史拉取 → useChat（SSE）→ Conversation 容器渲染。
 * 以 threadId 为 key 挂载，切换会话即重建（initialMessages 语义正确）。
 */
export function ChatScreen({ threadId }: { threadId: string }) {
  const { data, isPending } = useQuery({
    queryKey: chatKeys.messages(threadId),
    queryFn: () => fetchThreadMessages(threadId),
    staleTime: Infinity, // 历史只作初始消息，活动期间以 useChat 本地状态为准
  });

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  // ThreadMessage 与 UIMessage 结构同构（parts JSONB 回读宽化），此处显式断言
  return (
    <ChatScreenInner
      initialMessages={(data?.data ?? []) as unknown as UIMessage[]}
      threadId={threadId}
    />
  );
}

function ChatScreenInner({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: UIMessage[];
}) {
  const qc = useQueryClient();
  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    transport: new DefaultChatTransport({
      api: `/api/threads/${threadId}/messages`,
      // 契约：只发最新一条 UIMessage，历史服务端组装
      prepareSendMessagesRequest: ({ messages: ms }) => ({
        body: { message: ms[ms.length - 1] },
      }),
    }),
    messages: initialMessages,
    onFinish: () => {
      // 回复完成：刷新侧栏（新会话出现 / 标题 / 排序变化）
      qc.invalidateQueries({ queryKey: threadKeys.lists() });
    },
  });

  return (
    <div className="flex h-full flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl px-4 pt-8 pb-4">
          {messages.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-3 pt-32">
              <SparklesIcon className="size-8" />
              <p className="text-lg">有什么可以帮你？</p>
            </div>
          ) : (
            messages.map((m) => <MessageView key={m.id} message={m} />)
          )}
          {error && (
            <p className="text-destructive py-2 text-center text-sm">
              出错了，请稍后重试
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-2xl px-4 pb-4">
        <PromptInput
          onSubmit={(message) => {
            const text = message.text?.trim();
            if (text) sendMessage({ text });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="输入消息，Enter 发送" />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
