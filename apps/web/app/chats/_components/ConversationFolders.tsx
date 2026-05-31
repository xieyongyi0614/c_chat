'use client';

import { Button } from '@c_chat/ui';
import type { ConversationFolder } from '@/lib/stores/conversation.store';

const FOLDERS: { value: ConversationFolder; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'private', label: '私聊' },
  { value: 'group', label: '群组' },
];

interface ConversationFoldersProps {
  folder: ConversationFolder;
  onChange: (folder: ConversationFolder) => void;
}

export function ConversationFolders({ folder, onChange }: ConversationFoldersProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      {FOLDERS.map((item) => (
        <Button
          key={item.value}
          variant={folder === item.value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
