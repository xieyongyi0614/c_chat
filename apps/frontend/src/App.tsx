import { useState } from 'react'
import type { Chat } from './types/chat'
import { Sidebar } from './components/layout/Sidebar'
import { ChatHeader } from './components/layout/ChatHeader'
import { MessageList } from './features/chat/MessageList'
import { ChatInput } from './components/chat/ChatInput'

const mockChats: Chat[] = [
  {
    id: 1,
    name: 'Product 群',
    avatar: 'P',
    lastMessage: '这个方案我觉得可以先上线一版～',
    lastTime: '15:32',
    unread: 3,
    messages: [
      {
        id: 1,
        sender: 'them',
        text: '今天先把新版本的入口灰度给一部分用户吧？',
        time: '15:21'
      },
      {
        id: 2,
        sender: 'me',
        text: '可以，我这边 Electron 客户端也快调通了。',
        time: '15:25'
      },
      {
        id: 3,
        sender: 'them',
        text: '那我先在前端把埋点打好 👌',
        time: '15:32'
      }
    ]
  },
  {
    id: 2,
    name: '设计 – Chat UI',
    avatar: 'D',
    lastMessage: '我再优化一下暗色主题的对比度。',
    lastTime: '昨天',
    messages: [
      {
        id: 1,
        sender: 'them',
        text: '你看下这个类似 Telegram 的布局，还需要加什么？',
        time: '09:12'
      },
      {
        id: 2,
        sender: 'me',
        text: '整体很干净，我们保持左侧列表 + 右侧对话就行。',
        time: '09:18'
      }
    ]
  },
  {
    id: 3,
    name: '自己',
    avatar: '我',
    lastMessage: '记得明天把配置抽成 shared-config 包。',
    lastTime: '周二',
    messages: [
      {
        id: 1,
        sender: 'me',
        text: '记个 todo：把 TypeScript 配置都放到 @c_chat/typescript-config 里统一管理。',
        time: '21:08'
      }
    ]
  }
]

function App() {
  const [chats, setChats] = useState<Chat[]>(mockChats)
  const [activeId, setActiveId] = useState<number>(mockChats[0]?.id ?? 1)
  const [input, setInput] = useState('')

  const activeChat = chats.find((c) => c.id === activeId)

  const handleSend = () => {
    if (!input.trim() || !activeChat) return

    const now = new Date()
    const time = now.toTimeString().slice(0, 5)

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              lastMessage: input.trim(),
              lastTime: time,
              messages: [
                ...chat.messages,
                {
                  id: chat.messages.length + 1,
                  sender: 'me',
                  text: input.trim(),
                  time
                }
              ]
            }
          : chat
      )
    )

    setInput('')
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800 text-surface-50">
      <Sidebar chats={chats} activeId={activeId} onSelectChat={setActiveId} />

      <main className="flex flex-1 flex-col">
        {activeChat ? (
          <>
            <ChatHeader chat={activeChat} />
            <MessageList messages={activeChat.messages} />
            <ChatInput value={input} onChange={setInput} onSend={handleSend} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-surface-300">
            <h2 className="text-xl font-semibold text-surface-50">欢迎使用 c-chat</h2>
            <p className="text-sm">从左侧选择一个会话开始聊天吧。</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
