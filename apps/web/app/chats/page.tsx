'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user.store';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { conversationService } from '@/lib/services';

export default function ChatsPage() {
  const router = useRouter();
  const userInfo = useUserStore((state) => state.userInfo);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const conversations = useConversationStore((state) => state.conversations);
  const setConversations = useConversationStore((state) => state.setConversations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    const loadConversations = async () => {
      try {
        const list = await conversationService.getConversationList();
        setConversations(list);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isAuthenticated, router, setConversations]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex">
      {/* 左侧会话列表 */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">消息</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{userInfo?.nickname || userInfo?.username}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">加载中...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">暂无会话</div>
          ) : (
            <div>
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {conversation.targetName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.targetName}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(conversation.lastMsgTime).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conversation.lastMsgContent || '暂无消息'}
                      </p>
                    </div>
                    {(conversation.unreadCount || 0) > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">选择一个会话开始聊天</p>
        </div>
      </div>
    </div>
  );
}
