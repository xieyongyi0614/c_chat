import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '../../components/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover';
import { Separator } from '../../components/separator';
import { cn } from '../../lib/utils';
import { ChatAvatar } from '../chat-avatar';
import type { ChatLeftRailAccountMenuProps } from './types';

export function ChatLeftRailAccountMenu({ account, items, labels }: ChatLeftRailAccountMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex w-full flex-col items-center gap-2 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title={labels?.accountMenu ?? 'Account menu'}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <ChatAvatar
            id={account.id}
            title={account.title}
            avatarUrl={account.avatarUrl}
            alt={account.avatarAlt ?? account.title ?? 'account avatar'}
            className="size-11 ring-2 ring-background"
          />
          <MoreHorizontal className="size-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-40 p-1">
        <div className="flex flex-col gap-1">
          {items.map((item, index) => {
            const Icon = item.icon;
            const showSeparator = index > 0;

            return (
              <div key={item.id} className="flex flex-col gap-1">
                {showSeparator ? <Separator /> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'justify-start',
                    item.destructive && 'text-destructive hover:text-destructive',
                  )}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {Icon ? <Icon /> : null}
                  {item.label}
                </Button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
