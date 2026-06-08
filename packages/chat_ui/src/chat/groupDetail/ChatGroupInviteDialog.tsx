import { X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../components/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/dialog';
import { Alert, AlertDescription } from '../../components/alert';
import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import { Spinner } from '../../components/spinner';
import type { ChatGroupInviteLabels, ChatGroupInviteUser } from './types';

export interface ChatGroupInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: ChatGroupInviteUser[];
  selectedUsers: ChatGroupInviteUser[];
  onToggleUser: (user: ChatGroupInviteUser) => void;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string;
  labels?: ChatGroupInviteLabels;
}

const DEFAULT_LABELS: Required<ChatGroupInviteLabels> = {
  title: '邀请成员',
  description: '选择要加入群聊的成员',
  placeholder: '邀请成员...',
  empty: '暂无可邀请成员',
  selected: '已选',
  cancel: '取消',
  invite: '邀请成员',
  inviting: '邀请中...',
};

export function ChatGroupInviteDialog({
  open,
  onOpenChange,
  users,
  selectedUsers,
  onToggleUser,
  onSubmit,
  submitting = false,
  error,
  labels,
}: ChatGroupInviteDialogProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] max-w-[480px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{mergedLabels.title}</DialogTitle>
          {mergedLabels.description ? (
            <DialogDescription>{mergedLabels.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="flex flex-col gap-3">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex min-h-6 flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Button
                  key={user.id}
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => onToggleUser(user)}
                >
                  {user.nickname || user.email}
                  <X data-icon="inline-end" />
                </Button>
              ))}
            </div>
            <Command className="rounded-lg border">
              <CommandInput placeholder={mergedLabels.placeholder} />
              <CommandList className="max-h-[calc(100dvh-14rem)]">
                <CommandEmpty>{mergedLabels.empty}</CommandEmpty>
                <CommandGroup>
                  {users.map((user) => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => onToggleUser(user)}
                      className="flex cursor-pointer items-center justify-between"
                    >
                      <span>{user.nickname || user.email}</span>
                      {selectedUsers.some((item) => item.id === user.id) ? (
                        <Badge variant="secondary">{mergedLabels.selected}</Badge>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {mergedLabels.cancel}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || selectedUsers.length === 0}>
            {submitting ? <Spinner /> : null}
            {submitting ? mergedLabels.inviting : mergedLabels.invite}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
