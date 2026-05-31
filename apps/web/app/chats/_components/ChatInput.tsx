'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Mic, Paperclip, Send } from 'lucide-react';
import { Button, Spinner, Textarea } from '@c_chat/ui';
import { messageService } from '@/lib/services';

interface ChatInputProps {
  conversationId: string;
  onSent: () => void;
  disabled?: boolean;
}

export function ChatInput({ conversationId, onSent, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const content = value.trim();
    if (!content || sending || disabled) return;

    setSending(true);
    try {
      await messageService.sendMessage({ conversationId, content });
      setValue('');
      onSent();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const sendDisabled = !value.trim() || sending || disabled;

  return (
    <div className="border-t border-border p-4">
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? '会话已不可用' : '输入消息，Enter 发送，Shift+Enter 换行'}
          className="max-h-32 resize-none border-0 bg-transparent p-3 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex items-center gap-1">
            {/* 附件上传归属 06，录音归属 07，此处占位 */}
            <Button type="button" variant="ghost" size="icon" disabled aria-label="发送附件">
              <Paperclip />
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled aria-label="语音消息">
              <Mic />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={sendDisabled}
            onClick={() => {
              void submit();
            }}
          >
            {sending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            {sending ? '发送中' : '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
}
