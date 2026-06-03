'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, DragEvent } from 'react';
import { ChatComposer } from '@c_chat/ui';
import { getSelectFileInfoByFile } from '@c_chat/shared-utils';
import type { FileInfoListItem } from '@c_chat/shared-types';
import { messageService, uploadManager } from '@/lib/services';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatInputProps {
  conversationId: string;
  onSent: () => void;
  disabled?: boolean;
}

type WebAttachment = FileInfoListItem & {
  file: File;
};

export function ChatInput({ conversationId, onSent, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<WebAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    if (disabled || files.length === 0) return;

    const nextAttachments = await Promise.all(
      files.map(async (file) => ({
        ...(await getSelectFileInfoByFile(file)),
        file,
      })),
    );
    setAttachments((current) => [...current, ...nextAttachments]);
  };

  const submit = async () => {
    const content = value.trim();
    if ((!content && attachments.length === 0) || sending || disabled) return;

    setSending(true);
    try {
      if (content) {
        await messageService.sendMessage({ conversationId, content });
      }
      await Promise.all(
        attachments.map((attachment) =>
          uploadManager.upload({ file: attachment.file, conversationId }),
        ),
      );
      setValue('');
      for (const attachment of attachments) {
        if (attachment.url) URL.revokeObjectURL(attachment.url);
      }
      setAttachments([]);
      onSent();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFilePick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    void addFiles(files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (files.length === 0) return;
    event.preventDefault();
    void addFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="border-t border-border p-4">
      <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilePick} />
      <ChatComposer
        value={value}
        attachments={attachments}
        sending={sending}
        onValueChange={setValue}
        onSubmit={() => {
          void submit();
        }}
        onSelectFiles={() => fileInputRef.current?.click()}
        onRemoveAttachment={(id) => {
          const removed = attachments.find((item) => item.id === id);
          if (removed?.url) URL.revokeObjectURL(removed.url);
          setAttachments((current) => current.filter((item) => item.id !== id));
        }}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        actionsSlot={
          <VoiceRecorder conversationId={conversationId} onSent={onSent} disabled={disabled} />
        }
        disabled={disabled}
        className={disabled ? 'opacity-60' : undefined}
        labels={{
          placeholder: disabled ? '会话已不可用' : '输入消息，或粘贴/拖拽图片和文件，Enter 发送',
          send: '发送',
          sending: '发送中...',
          attach: '添加文件',
          previewTitle: '附件预览',
        }}
      />
    </div>
  );
}
