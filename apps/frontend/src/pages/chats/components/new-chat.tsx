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
} from '@c_chat/ui';
import { type ChatUser } from '../data/chat-types';
import { ipc } from '@c_chat/shared-utils';
import type { SocketTypes, UserTypes } from '@c_chat/shared-types';

type User = Omit<ChatUser, 'messages'>;

type NewChatProps = {
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
export function NewChat({ users, onOpenChange, open }: NewChatProps) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userList, setUserList] = useState<SocketTypes.ResponseList<UserTypes.UserListItem>>();
  useEffect(() => {
    if (open) {
      getUserList();
    }
  }, [open]);

  const getUserList = async () => {
    const res = await ipc.GetUserList({ word: '' });
    console.log(res, 'userList');
    setUserList(res);
  };
  const handleSelectUser = (user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    } else {
      handleRemoveUser(user.id);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // Reset selected users when dialog closes
    if (!newOpen) {
      setSelectedUsers([]);
    }
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
              <Badge key={user.id} variant="default">
                {user.fullName}
                <button
                  className="ms-1 rounded-full ring-offset-background outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRemoveUser(user.id);
                    }
                  }}
                  onClick={() => handleRemoveUser(user.id)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
          </div>
          <Command className="rounded-lg border">
            <CommandInput placeholder="搜索账号..." className="text-foreground" />
            <CommandList>
              <CommandEmpty>未找到账号。</CommandEmpty>
              <CommandGroup>
                {userList?.list.map((user) => (
                  <CommandItem
                    key={user.id}
                    // onSelect={() => handleSelectUser(user)}
                    className="flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={user.avatar_url || '/placeholder.svg'}
                        alt={user.nickname || user.email}
                        className="h-8 w-8 rounded-full"
                      />
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
          <Button
            variant={'default'}
            // onClick={() => showSubmittedData(selectedUsers)}
            disabled={selectedUsers.length === 0}
          >
            Chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
