import { useEffect, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Spinner } from "#/components/ui/spinner";

import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useThreadSearch } from "../hooks/use-thread-search";
import { HighlightText } from "./highlight-text";

/**
 * 全局会话搜索弹窗：侧边栏按钮或 ⌘K/Ctrl+K 唤起，输入防抖 300ms 服务端搜索
 * （cmdk shouldFilter={false}，过滤全部由 API 承担），选中跳转会话。
 * 不用 CommandDialog 包装：它不透传 shouldFilter，会启用客户端过滤遮蔽服务端结果。
 */
export function ThreadSearchDialog({
  onOpenChange,
  onSelect,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  onSelect: (threadId: string) => void;
  open: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const debounced = useDebouncedValue(keyword, 300);
  const q = debounced.trim();
  const { data, isFetching } = useThreadSearch(debounced);
  const items = data?.items ?? [];

  // ⌘K / Ctrl+K 全局唤起（Esc 关闭由 Dialog 自带）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  // 关闭即清空，下次打开不留旧关键词与旧结果
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) setKeyword("");
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>搜索会话</DialogTitle>
          <DialogDescription>按关键字搜索会话标题与正文内容</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setKeyword}
            placeholder="搜索会话标题或内容…"
            value={keyword}
          />
          <CommandList className="h-[380px] overflow-y-auto">
            {q.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                输入关键词搜索会话标题与正文
              </p>
            ) : items.length === 0 ? (
              isFetching ? (
                <div className="flex justify-center py-6">
                  <Spinner className="text-muted-foreground size-5" />
                </div>
              ) : (
                <CommandEmpty>未找到相关会话</CommandEmpty>
              )
            ) : (
              <CommandGroup heading="会话">
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      handleOpenChange(false);
                      onSelect(item.id);
                    }}
                    value={item.id}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <HighlightText
                        className="block truncate text-sm font-medium"
                        keyword={q}
                        text={item.title}
                      />
                      {item.snippet && (
                        <HighlightText
                          className="text-muted-foreground block truncate text-xs"
                          keyword={q}
                          text={item.snippet}
                        />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
