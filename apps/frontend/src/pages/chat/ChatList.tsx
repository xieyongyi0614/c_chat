import type { Chat } from '../../types/chat'

type Props = {
  chats: Chat[]
  activeId: number
  onSelect: (id: number) => void
}

export function ChatList({ chats, activeId, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-2 pb-2 pt-1 space-y-1 scrollbar-thin scrollbar-thumb-surface-200/40">
      {chats.map((chat) => (
        <button
          key={chat.id}
          className={`flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition-colors ${
            chat.id === activeId
              ? 'bg-primary-500/10 text-surface-50'
              : 'text-surface-100 hover:bg-surface-800/70'
          }`}
          onClick={() => onSelect(chat.id)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 to-primary-500 text-xs font-semibold text-surface-900">
            {chat.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="truncate text-xs font-medium">{chat.name}</span>
              <span className="ml-2 shrink-0 text-[10px] text-surface-400">{chat.lastTime}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-surface-400">{chat.lastMessage}</span>
              {chat.unread && chat.unread > 0 && (
                <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-medium text-white">
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}


