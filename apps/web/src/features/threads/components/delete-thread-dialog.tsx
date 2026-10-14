import { Loader2Icon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

import { useDeleteThread } from "../hooks/use-thread-mutations";

/**
 * 删除会话确认弹窗：header 更多菜单与侧栏目录共用。
 * 删除进行中时按钮文本前显示 loading 图标并禁用全部按钮；成功后关闭并回调 onDeleted
 * （header 用它跳回主页，侧栏用它清 active）。
 */
interface DeleteThreadDialogProps {
  threadId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 删除成功后回调（弹窗已关闭），参数为被删会话 id */
  onDeleted?: (id: string) => void;
}

export function DeleteThreadDialog({
  threadId,
  title,
  open,
  onOpenChange,
  onDeleted,
}: DeleteThreadDialogProps) {
  const remove = useDeleteThread();

  const confirmDelete = () => {
    remove.mutate(threadId, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.(threadId);
      },
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>删除会话</DialogTitle>
          <DialogDescription>
            确定删除「{title}」吗？会话内的全部消息将一并删除，此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={remove.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            取消
          </Button>
          <Button
            disabled={remove.isPending}
            onClick={confirmDelete}
            variant="destructive"
          >
            {remove.isPending && <Loader2Icon className="animate-spin" />}
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
