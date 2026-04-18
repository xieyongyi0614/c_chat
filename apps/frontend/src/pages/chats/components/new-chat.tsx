import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@c_chat/ui';
import { ipc, to } from '@c_chat/shared-utils';
import type { IpcTypes, UserTypes } from '@c_chat/shared-types';
import { toast } from 'sonner';

type NewChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: UserTypes.UserListItem) => void;
};
export function NewChat({ onOpenChange, open, onSelectUser }: NewChatProps) {
  const [userListData, setUserListData] = useState<Awaited<ReturnType<IpcTypes['GetUserList']>>>();
  const [selectedUsers, setSelectedUsers] = useState<UserTypes.UserListItem[]>([]);
  useEffect(() => {
    if (open) {
      getUserList();
    }
  }, [open]);

  const getUserList = async () => {
    const [err, res] = await to(ipc.GetUserList({ word: '' }));
    if (err) {
      toast.error('获取用户列表失败');
      return;
    }
    setUserListData(res);
  };
  const handleSelectUser = async (user: UserTypes.UserListItem) => {
    // onSelectUser(user);
    // onOpenChange(false);
    setSelectedUsers((p) =>
      p.some((u) => u.id === user.id) ? p.filter((u) => u.id !== user.id) : [...p, user],
    );
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((p) => p.filter((user) => user.id !== userId));
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // Reset selected users when dialog closes
    if (!newOpen) {
      setSelectedUsers([]);
    }
  };
  const handleSubmit = () => {
    /** 群聊 */
    if (selectedUsers.length > 1) {
      toast.error('群聊暂未处理');
    } else {
      onSelectUser(selectedUsers[0]);
    }
    onOpenChange(false);
    setSelectedUsers([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>新消息</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline-last gap-2">
            <span className="min-h-6 text-sm text-muted-foreground">To:</span>
            {selectedUsers.map((user) => (
              <Badge variant="default" key={user.id} onClick={() => handleRemoveUser(user.id)}>
                {user.nickname ?? user.email}
                <X data-icon="inline-end" />
              </Badge>
            ))}
          </div>
          <Command className="rounded-lg border">
            <CommandInput placeholder="搜索账号..." className="text-foreground" />
            <CommandList>
              <CommandEmpty>未找到账号。</CommandEmpty>
              <CommandGroup>
                {userListData?.list.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleSelectUser(user)}
                    className="flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {/* <img
                        src={user.avatarUrl ?? ''}
                        alt={user.nickname || user.email}
                        className="h-8 w-8 rounded-full"
                      /> */}

                      <Avatar>
                        <AvatarImage
                          src={user.avatarUrl ?? ''}
                          alt="@shadcn"
                          className="grayscale"
                        />
                        <AvatarFallback>
                          {(user.nickname || user.email).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.nickname}</span>
                        <span className="text-xs text-accent-foreground/70">{user.email}</span>
                      </div>
                    </div>

                    {selectedUsers.find((u) => u.id === user.id) && <Check className="h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <Button variant={'default'} onClick={handleSubmit} disabled={selectedUsers.length === 0}>
            Chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
