import { useState } from 'react';
import type { FriendRequest } from '../../types/chat';

type Props = {
  requests: FriendRequest[];
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
  onClose: () => void;
};

export function FriendRequestNotification({ requests, onAccept, onReject, onClose }: Props) {
  const [isVisible, setIsVisible] = useState(true);

  if (requests.length === 0 || !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  return (
    <div className="fixed top-4 right-4 z-40 w-80 rounded-xl bg-surface-800 border border-surface-200/20 shadow-2xl">
      <div className="flex items-center justify-between border-b border-surface-200/20 px-4 py-3">
        <h3 className="text-sm font-semibold text-surface-50">好友申请 ({requests.length})</h3>
        <button
          onClick={handleClose}
          className="rounded-full p-1 text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {requests.map((request) => (
          <div key={request.id} className="border-b border-surface-200/10 p-4 last:border-b-0">
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
                <p className="mt-1 text-xs text-surface-300 truncate">
                  {request.message || '请求添加您为好友'}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onAccept(request.id)}
                    className="rounded px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    接受
                  </button>
                  <button
                    onClick={() => onReject(request.id)}
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
    </div>
  );
}
