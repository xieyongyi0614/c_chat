import type { Chat } from '../../types/chat';
import { ChatList } from '../../features/chat/ChatList';

type Props = {
  chats: Chat[];
  activeId: number;
  onSelectChat: (id: number) => void;
};

export function Sidebar({ chats, activeId, onSelectChat }: Props) {
  return (
    <aside className="flex min-w-[280px] max-w-[360px] w-80 flex-col border-r border-surface-200/10 bg-gradient-to-b from-surface-800/60 via-surface-900 to-surface-900/95">
      <header className="flex flex-col gap-1 px-4 pt-4 pb-3">
        <span className="text-base font-semibold tracking-wide text-surface-50">c-chat</span>
        {/* <span className="text-xs text-surface-200/70">简洁 · 专注 · 高效</span> */}
      </header>

      <div className="px-4 pb-3">
        <input
          className="w-full rounded-full border border-surface-200/20 bg-surface-900/80 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-400 focus:border-primary-400/60 focus:outline-none focus:ring-1 focus:ring-primary-400/40"
          placeholder="搜索联系人或群聊"
        />
      </div>

      <ChatList chats={chats} activeId={activeId} onSelect={onSelectChat} />
    </aside>
  );
}
