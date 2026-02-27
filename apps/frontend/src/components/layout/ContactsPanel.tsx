import { useState } from 'react'
import type { User, FriendRequest } from '../../types/chat'

type Props = {
  contacts: User[]
  friendRequests: FriendRequest[]
  onAddFriendClick: () => void
  onContactSelect: (contact: User) => void
  onAcceptRequest: (requestId: number) => void
  onRejectRequest: (requestId: number) => void
}

const mockContacts: User[] = [
  {
    id: 1,
    username: 'alice_wang',
    nickname: 'Alice Wang',
    avatar: 'A',
    signature: 'Designer & Developer',
    status: 'online'
  },
  {
    id: 2,
    username: 'bob_chen',
    nickname: 'Bob Chen',
    avatar: 'B',
    signature: 'Frontend Engineer',
    status: 'away'
  },
  {
    id: 3,
    username: 'charlie_liu',
    nickname: 'Charlie Liu',
    avatar: 'C',
    signature: 'Backend Developer',
    status: 'offline'
  },
  {
    id: 4,
    username: 'david_zhang',
    nickname: 'David Zhang',
    avatar: 'D',
    signature: 'Mobile Developer',
    status: 'online'
  }
]

export function ContactsPanel({ 
  contacts = mockContacts, 
  friendRequests = [],
  onAddFriendClick, 
  onContactSelect,
  onAcceptRequest,
  onRejectRequest
}: Props) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests'>('contacts')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredContacts = contacts.filter(
    contact => 
      contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex w-80 flex-col border-r border-surface-200/10 bg-gradient-to-b from-surface-800/60 via-surface-900 to-surface-900/95">
      {/* 顶部标题和标签切换 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-base font-semibold text-surface-50">通讯录</h2>
        <button
          onClick={onAddFriendClick}
          className="rounded-full p-1.5 text-surface-300 hover:bg-surface-800/70 hover:text-surface-50 transition-colors"
          title="添加朋友"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-surface-200/10 px-4">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-surface-400 hover:text-surface-300'
          }`}
        >
          联系人 ({filteredContacts.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 text-center text-sm font-medium transition-colors relative ${
            activeTab === 'requests'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-surface-400 hover:text-surface-300'
          }`}
        >
          申请记录 ({friendRequests.length})
          {friendRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {friendRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* 搜索框 */}
      {activeTab === 'contacts' && (
        <div className="px-4 py-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-surface-200/20 bg-surface-900/80 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-400 focus:border-primary-400/60 focus:outline-none focus:ring-1 focus:ring-primary-400/40"
            placeholder="搜索联系人"
          />
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contacts' ? (
          // 联系人列表
          filteredContacts.length > 0 ? (
            <div className="space-y-1 px-2 pb-2">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => onContactSelect(contact)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors text-surface-100 hover:bg-surface-800/70"
                >
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 to-primary-500 text-xs font-semibold text-surface-900">
                      {contact.avatar}
                    </div>
                    <span className={`absolute bottom-0 right-0 inline-block h-2.5 w-2.5 rounded-full border-2 border-surface-900 ${
                      contact.status === 'online' ? 'bg-green-400' :
                      contact.status === 'away' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-surface-50">
                        {contact.nickname}
                      </span>
                    </div>
                    {contact.signature && (
                      <span className="truncate text-xs text-surface-400">
                        {contact.signature}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-surface-400">
              <span className="text-2xl">👥</span>
              <p className="text-sm">暂无联系人</p>
            </div>
          )
        ) : (
          // 申请记录列表
          friendRequests.length > 0 ? (
            <div className="space-y-2 px-2 py-2">
              {friendRequests.map((request) => (
                <div key={request.id} className="rounded-xl bg-surface-800/50 p-3 border border-surface-200/10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 to-primary-500 text-sm font-semibold text-surface-900">
                      {request.fromUser.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium text-surface-50">
                          {request.fromUser.nickname}
                        </span>
                        <span className="text-xs text-surface-400">
                          {new Date(request.createTime).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-surface-300">
                        {request.message || '请求添加您为好友'}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => onAcceptRequest(request.id)}
                          className="rounded px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        >
                          接受
                        </button>
                        <button
                          onClick={() => onRejectRequest(request.id)}
                          className="rounded px-3 py-1 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-surface-400">
              <span className="text-2xl">📝</span>
              <p className="text-sm">暂无申请记录</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}