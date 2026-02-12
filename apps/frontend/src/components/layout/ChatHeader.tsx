import type { Chat } from '../../types/chat'

type Props = {
  chat: Chat
}

export function ChatHeader({ chat }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-200/10 bg-gradient-to-r from-surface-900/95 via-surface-900/90 to-surface-800/90 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 to-primary-500 text-sm font-semibold text-surface-900">
          {chat.avatar}
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium text-surface-50">{chat.name}</div>
          <div className="text-xs text-status-online">在线 · 正在输入...</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-800/80 text-xs text-surface-300 hover:bg-surface-700 hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="搜索"
        >
          🔍
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-800/80 text-xs text-surface-300 hover:bg-surface-700 hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="更多"
        >
          ⋯
        </button>
      </div>
    </header>
  )
}


