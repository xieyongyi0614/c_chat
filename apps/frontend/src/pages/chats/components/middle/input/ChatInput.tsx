import { useState } from 'react';
import type { ClipboardEvent, DragEvent } from 'react';
import { ChatComposer, DEFAULT_SCROLL_TO_BOTTOM_EVENT } from '@c_chat/ui';

import {
  bufferToPreviewUrl,
  generateLastMsgContent,
  getSelectFileInfoByFile,
  ipc,
  to,
} from '@c_chat/shared-utils';
import { toast } from 'sonner';
import { useChatStore, useMessageStore } from '@c_chat/frontend/stores';
import { type FileInfoListItem } from '@c_chat/shared-types';
import RecordingButton from './RecordingButton';

export function ChatInput() {
  const { selectedConversation, selectedUserForDraft, upsertAndPinConversation } = useChatStore();
  const { addMsgList } = useMessageStore();

  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<FileInfoListItem[]>([]);

  const handleFileSelect = async () => {
    const files = await ipc.SelectFiles({});

    const newFiles: FileInfoListItem[] = await Promise.all(
      files.map(async (file) => {
        let metadata: FileInfoListItem['metadata'];
        if (file.fileType === 'audio') {
          const audioInfo = await ipc.getAudioInfoByLocalPath({ filePath: file.filePath });
          metadata = {
            ...audioInfo,
            waveform: audioInfo.waveformBase64,
            type: 'audio',
            size: file.fileSize,
          };
        }
        return {
          ...file,
          metadata,
          url:
            file.fileType === 'image'
              ? bufferToPreviewUrl({
                  buffer: await ipc.ReadLocalFile({ path: file.filePath }),
                  type: file.mimeType,
                })
              : undefined,
        };
      }),
    );

    setAttachments((state) => [...state, ...newFiles]);
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      const newAttachments = await Promise.all(files.map((file) => getSelectFileInfoByFile(file)));
      setAttachments((state) => [...state, ...newAttachments]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      // await handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const sendMessageContent = async (content: string, files?: FileInfoListItem[]) => {
    if (!selectedConversation && !selectedUserForDraft) return;
    const isDraft = selectedUserForDraft && !selectedConversation;

    const sendMessageParams = {
      content,
      files,
      ...(isDraft
        ? { targetId: selectedUserForDraft?.id }
        : { conversationId: selectedConversation?.id }),
    };

    const [err, messages] = await to(ipc.SendMessage(sendMessageParams));
    if (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
      return;
    }
    addMsgList(messages);
    if (selectedConversation && messages.length > 0) {
      const latestMessage = messages.reduce((latest, message) =>
        (message.createTime ?? 0) > (latest.createTime ?? 0) ? message : latest,
      );
      upsertAndPinConversation({
        ...selectedConversation,
        lastMsgContent: generateLastMsgContent(latestMessage.type, latestMessage.content),
        lastMsgTime: latestMessage.createTime ?? Date.now(),
      });
    }
    window.dispatchEvent(new Event(DEFAULT_SCROLL_TO_BOTTOM_EVENT));
    return true;
  };

  const handleSubmit = async () => {
    const textContent = inputValue.trim();
    if (!textContent && attachments.length === 0) {
      toast.warning('Please enter a message or add an attachment');
      return;
    }

    setSending(true);

    const res = await sendMessageContent(inputValue, attachments);
    setSending(false);
    if (!res) {
      return;
    }
    setInputValue('');
    setAttachments([]);
  };

  return (
    <ChatComposer
      value={inputValue}
      attachments={attachments}
      sending={sending}
      onValueChange={setInputValue}
      onSubmit={() => {
        void handleSubmit();
      }}
      onSelectFiles={() => {
        void handleFileSelect();
      }}
      onRemoveAttachment={(id) => {
        const removed = attachments.find((item) => item.id === id);
        if (removed?.url) URL.revokeObjectURL(removed.url);
        setAttachments((prev) => prev.filter((item) => item.id !== id));
      }}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      actionsSlot={<RecordingButton />}
      labels={{
        placeholder: '输入消息，或粘贴/拖拽图片...',
        send: '发送',
        sending: '发送中...',
        attach: '添加文件',
        previewTitle: '附件预览',
      }}
    />
  );
}
