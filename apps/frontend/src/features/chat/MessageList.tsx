import type { Message } from '../../types/chat'

type Props = {
  messages: Message[]
}

export function MessageList({ messages }: Props) {
  return (
    <section className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800 px-4 py-3 scrollbar-thin scrollbar-thumb-surface-200/40">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[70%] rounded-message px-3 py-2 text-sm leading-relaxed shadow-sm animate-fade-in ${
              msg.sender === 'me'
                ? 'rounded-br-[4px] bg-gradient-to-br from-primary-500 to-primary-400 text-white'
                : 'rounded-bl-[4px] bg-surface-800/80 text-surface-50'
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.text}</div>
            <div
              className={`mt-0.5 text-right text-[11px] ${
                msg.sender === 'me' ? 'text-surface-50/80' : 'text-surface-400'
              }`}
            >
              <span>{msg.time}</span>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}


