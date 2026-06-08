import { memo } from 'react';
import { Separator } from '../../components/separator';
import { cn } from '../../lib/utils';
import { ChatLeftRailAccountMenu } from './ChatLeftRailAccountMenu';
import { ChatLeftRailFilterButton } from './ChatLeftRailFilterButton';
import { ChatLeftRailNavButton } from './ChatLeftRailNavButton';
import type { ChatLeftRailProps } from './types';

function ChatLeftRailBase({
  navItems,
  filterItems,
  activeNavId,
  activeFilterId,
  account,
  onSelectNav,
  onSelectFilter,
  accountMenuItems,
  className,
  labels,
}: ChatLeftRailProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-[84px] shrink-0 flex-col border-r bg-background/95 text-foreground',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 px-3 py-4">
        <div className="flex flex-col items-center gap-1.5">
          {navItems.map((item) => (
            <ChatLeftRailNavButton
              key={item.id}
              item={item}
              active={activeNavId === item.id}
              onSelect={onSelectNav}
            />
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-4">
        {filterItems.map((item) => (
          <ChatLeftRailFilterButton
            key={item.id}
            item={item}
            active={activeFilterId === item.id}
            onSelect={onSelectFilter}
          />
        ))}
      </div>

      <div className="border-t px-3 py-3">
        <ChatLeftRailAccountMenu account={account} items={accountMenuItems} labels={labels} />
      </div>
    </aside>
  );
}

export const ChatLeftRail = memo(ChatLeftRailBase);
