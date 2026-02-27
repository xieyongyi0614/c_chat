import { useState } from 'react';
import type { User, AddFriendFormData } from '../../types/chat';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAddFriend: (formData: AddFriendFormData) => void;
};

const mockUsers: User[] = [
  {
    id: 1,
    username: 'alice_wang',
    nickname: 'Alice Wang',
    avatar: 'A',
    signature: 'Designer & Developer',
    status: 'online',
  },
  {
    id: 2,
    username: 'bob_chen',
    nickname: 'Bob Chen',
    avatar: 'B',
    signature: 'Frontend Engineer',
    status: 'away',
  },
  {
    id: 3,
    username: 'charlie_liu',
    nickname: 'Charlie Liu',
    avatar: 'C',
    signature: 'Backend Developer',
    status: 'offline',
  },
];

export function AddFriendModal({ isOpen, onClose, onAddFriend }: Props) {
  const [formData, setFormData] = useState<AddFriendFormData>({
    searchQuery: '',
    addMessage: '你好，我想添加你为好友',
  });
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  if (!isOpen) return null;

  const handleSearch = () => {
    if (formData.searchQuery.trim()) {
      const results = mockUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(formData.searchQuery.toLowerCase()) ||
          user.nickname.toLowerCase().includes(formData.searchQuery.toLowerCase()),
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleSubmit = () => {
    if (selectedUser && formData.addMessage.trim()) {
      onAddFriend(formData);
      // 重置表单
      setFormData({
        searchQuery: '',
        addMessage: '你好，我想添加你为好友',
      });
      setSearchResults([]);
      setSelectedUser(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-surface-800 border border-surface-200/20 shadow-2xl">
        <div className="border-b border-surface-200/20 px-6 py-4">
          <h2 className="text-lg font-semibold text-surface-50">添加好友</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* 搜索区域 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-surface-200">搜索用户</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.searchQuery}
                onChange={(e) => setFormData((prev) => ({ ...prev, searchQuery: e.target.value }))}
                onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 rounded-lg border border-surface-200/20 bg-surface-900/80 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:border-primary-400/60 focus:outline-none focus:ring-1 focus:ring-primary-400/40"
                placeholder="输入用户名或昵称"
              />
              <button
                onClick={handleSearch}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-surface-200">搜索结果</h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-primary-500/20 border border-primary-400/40'
                        : 'bg-surface-900/50 hover:bg-surface-800/70'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 to-primary-500 text-sm font-semibold text-surface-900">
                      {user.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-surface-50">
                          {user.nickname}
                        </span>
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            user.status === 'online'
                              ? 'bg-green-400'
                              : user.status === 'away'
                                ? 'bg-yellow-400'
                                : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <span className="truncate text-xs text-surface-400">@{user.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 添加信息 */}
          {selectedUser && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-surface-200">发送添加好友申请</label>
              <textarea
                value={formData.addMessage}
                onChange={(e) => setFormData((prev) => ({ ...prev, addMessage: e.target.value }))}
                className="w-full rounded-lg border border-surface-200/20 bg-surface-900/80 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:border-primary-400/60 focus:outline-none focus:ring-1 focus:ring-primary-400/40 resize-none"
                rows={3}
                placeholder="请输入添加好友的验证信息..."
              />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 border-t border-surface-200/20 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-surface-300 hover:bg-surface-800/70 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedUser || !formData.addMessage.trim()}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送申请
          </button>
        </div>
      </div>
    </div>
  );
}
