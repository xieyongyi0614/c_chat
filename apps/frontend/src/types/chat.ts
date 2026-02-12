export type Message = {
  id: number
  sender: 'me' | 'them'
  text: string
  time: string
}

export type Chat = {
  id: number
  name: string
  avatar: string
  lastMessage: string
  lastTime: string
  unread?: number
  messages: Message[]
}


