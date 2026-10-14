import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import axios from "axios";
import { SparklesIcon } from "lucide-react";
import { useRef } from "react";
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
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { threadKeys } from "#/features/threads/query-keys";

import { fetchThreadMessages } from "../api";
import { chatKeys } from "../query-keys";
import { ChatErrorAlert } from "./chat-error-alert";
import { MessageView } from "./message-view";

/**
 * 右侧对话主区：历史拉取 → useChat（SSE）→ Conversation 容器渲染。
 * 以 threadId 为 key 挂载，切换会话即重建（initialMessages 语义正确）。
 * 草稿会话（isDraft）服务端尚不存在，跳过历史查询直接进空对话。
 */
export function ChatScreen({
  threadId,
  isDraft,
}: {
  threadId: string;
  isDraft: boolean;
}) {
  // 取挂载瞬间的快照：草稿在首条消息后落库，但本实例不回头拉历史
  // （进行中的消息以 useChat 本地状态为准），也避免标志翻转把活动对话重挂载
  const draftAtMount = useRef(isDraft).current;
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: chatKeys.messages(threadId),
    queryFn: () => fetchThreadMessages(threadId),
    staleTime: Infinity, // 历史只作初始消息，活动期间以 useChat 本地状态为准
    enabled: !draftAtMount, // 草稿会话未落库，请求必然 404
    retry: false,
  });

  if (draftAtMount) {
    return <ChatScreenInner initialMessages={[]} isDraftMount threadId={threadId} />;
  }

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError) {
    // 404（不存在/非本人统一）原地空态，不跳转：URL 如实反映所指向会话的状态
    const threadGone = axios.isAxiosError(error) && error.response?.status === 404;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">
          {threadGone ? "会话不存在或已被删除" : "会话加载失败，请稍后重试"}
        </p>
        {threadGone ? (
          <Button asChild>
            <Link to="/">返回主页</Link>
          </Button>
        ) : (
          <Button onClick={() => void refetch()} variant="outline">
            重试
          </Button>
        )}
      </div>
    );
  }

  // ThreadMessage 与 UIMessage 结构同构（parts JSONB 回读宽化），此处显式断言
  return (
    <ChatScreenInner
      initialMessages={(data?.data ?? []) as unknown as UIMessage[]}
      isDraftMount={false}
      threadId={threadId}
    />
  );
}

function ChatScreenInner({
  threadId,
  initialMessages,
  isDraftMount,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  /** 本次挂载从草稿开始：会话在首条消息完成时才于服务端落库 */
  isDraftMount: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  // 落库只发生一次：首个 onFinish 刷新侧栏（新会话出现），后续消息不再触发列表请求
  const threadCreated = useRef(false);
  // 草稿首发后只切一次 URL（/ → /chat/:id）
  const urlNavigated = useRef(false);
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
      // 草稿首条消息完成 = 会话刚落库，侧栏需出现新条目；仅此一次失效列表
      if (isDraftMount && !threadCreated.current) {
        threadCreated.current = true;
        qc.invalidateQueries({ queryKey: threadKeys.lists() });
      }
    },
  });

  // 空会话：输入框垂直居中；有消息即瞬切到底部布局，不做任何入场/位移动画。
  // 居中靠上下 flex-1 占位实现：composer 外层两种状态下布局类不变（高度恒随内容），
  // 否则 flex-grow 等布局属性变化会被 duration-* 隐式开启的 transition(all) 平滑插值
  const centered = messages.length === 0;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {centered ? (
        <div className="flex-1" />
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-2xl px-4 pt-8 pb-4">
            {messages.map((m) => (
              <MessageView key={m.id} message={m} threadId={threadId} />
            ))}
            {error && <ChatErrorAlert error={error} />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="mx-auto w-full max-w-2xl px-4 pb-4">
        {centered && (
          <div className="text-muted-foreground mb-6 flex flex-col items-center gap-3">
            <SparklesIcon className="size-8" />
            <p className="text-lg">有什么可以帮你？</p>
          </div>
        )}
        <PromptInput
          onSubmit={(message) => {
            const text = message.text?.trim();
            if (!text) return;
            sendMessage({ text });
            // 草稿首发：会话已由服务端落库，URL 切到 /chat/:id（threadId 不变不 remount，流式继续）
            if (isDraftMount && !urlNavigated.current) {
              urlNavigated.current = true;
              navigate({
                to: "/chat/$threadId",
                params: { threadId },
                replace: true,
              });
            }
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

      {centered && <div className="flex-1" />}
    </div>
  );
}
