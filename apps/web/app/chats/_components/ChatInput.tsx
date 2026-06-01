'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Button, Spinner, Textarea } from '@c_chat/ui';
import { messageService, uploadManager } from '@/lib/services';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatInputProps {
  conversationId: string;
  onSent: () => void;
  disabled?: boolean;
}

export function ChatInput({ conversationId, onSent, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFiles = async (files: File[]) => {
    if (disabled || files.length === 0) return;
    for (const file of files) {
      await uploadManager.upload({ file, conversationId });
    }
    onSent();
  };

  const handleFilePick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    void uploadFiles(files);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    void uploadFiles(files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setDragOver(true);
  };

  const sendDisabled = !value.trim() || sending || disabled;

  return (
    <div className="border-t border-border p-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        className={`overflow-hidden rounded-xl border bg-background ${
          dragOver ? 'border-primary ring-2 ring-primary/40' : 'border-border'
        }`}
      >
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            disabled
              ? '会话已不可用'
              : dragOver
                ? '释放以上传文件'
                : '输入消息，Enter 发送，Shift+Enter 换行'
          }
          className="max-h-32 resize-none border-0 bg-transparent p-3 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilePick} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label="发送附件"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
            </Button>
            <VoiceRecorder conversationId={conversationId} onSent={onSent} disabled={disabled} />
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
