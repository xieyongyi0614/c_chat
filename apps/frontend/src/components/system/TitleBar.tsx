import React from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from '@c_chat/ui';

type TitleBarProps = {
  title?: string;
};

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'C Chat' }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center justify-between px-3 bg-background/80 backdrop-blur border-b app-drag">
      <div className="text-sm font-medium select-none">{title}</div>
      <div className="flex items-center gap-2 app-no-drag">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.api?.openSettings?.();
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            window.api?.closeWindow?.();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
