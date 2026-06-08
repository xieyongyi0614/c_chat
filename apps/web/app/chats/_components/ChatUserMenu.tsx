'use client';

import { Button, ChatAvatar, Popover, PopoverContent, PopoverTrigger, Separator } from '@c_chat/ui';
import type { AuthTypes } from '@c_chat/shared-types';

interface ChatUserMenuProps {
  userInfo: AuthTypes.GetUserInfoResponse | null;
  loggingOut: boolean;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export function ChatUserMenu({ userInfo, loggingOut, onOpenProfile, onLogout }: ChatUserMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <ChatAvatar
            id={userInfo?.id ?? ''}
            title={userInfo?.nickname || userInfo?.email}
            avatarUrl={userInfo?.avatarUrl}
            className="size-6"
            fallbackClassName="text-xs"
          />
          <span className="max-w-32 truncate text-sm">{userInfo?.nickname || userInfo?.email}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="justify-start" onClick={onOpenProfile}>
            Profile
          </Button>
          <Separator className="my-1" />
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={onLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
