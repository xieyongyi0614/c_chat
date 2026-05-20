import React from 'react';
import { Settings, UserRound } from 'lucide-react';
import { Button } from '@c_chat/ui';
import { CloseAppBtn } from './CloseAppBtn';
import { useUserStore } from '@c_chat/frontend/stores';

type TitleBarProps = {
  title?: string;
};

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'C Chat' }) => {
  const userInfo = useUserStore((state) => state.userInfo);
  const windowId = window.c_chat?.windowId;
  const accountName = userInfo?.nickname || userInfo?.email || '未登录';
  const windowLabel = windowId ? `窗口 ${windowId}` : '窗口';

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center justify-between px-3 bg-background/80 backdrop-blur border-b app-drag">
        <div className="flex min-w-0 items-center gap-2 select-none">
          <div className="shrink-0 text-sm font-medium">{title}</div>
          <div className="h-4 w-px shrink-0 bg-border" />
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="shrink-0 rounded-sm border px-1.5 py-0.5">{windowLabel}</span>
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{accountName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 app-no-drag">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // window.api?.openSettings?.();
            }}
          >
            <Settings />
          </Button>

          <CloseAppBtn />
        </div>
      </div>
    </>
  );
};
