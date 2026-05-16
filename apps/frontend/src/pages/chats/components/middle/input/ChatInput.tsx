import { useState } from 'react';
import type { ClipboardEvent, DragEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button, Textarea } from '@c_chat/ui';

import { AttachmentList } from './attachments/AttachmentList';
import { EmojiPicker } from './EmojiPicker';
import { bufferToPreviewUrl, getSelectFileInfoByFile, ipc, to } from '@c_chat/shared-utils';
import { toast } from 'sonner';
import { useChatStore, useMessageStore } from '@c_chat/frontend/stores';
import { type FileInfoListItem } from '@c_chat/shared-types';
import RecordingButton from './RecordingButton';

export function ChatInput() {
  const {
    selectedConversation,
    selectedUserForDraft,
    setSelectedConversation,
    upsertAndPinConversation,
  } = useChatStore();
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
    console.log('handleFileSelect', newFiles);

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

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      // await handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => `${prev}${emoji}`);
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
      toast.error('发送消息失败');
      return;
    }
    addMsgList(messages);

    if (selectedConversation) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.conversationId === selectedConversation.id) {
        const updatedConvo = {
          ...selectedConversation,
          lastMsgContent: content,
          lastMsgTime: lastMsg.createTime,
          updateTime: lastMsg.createTime,
        };

        upsertAndPinConversation(updatedConvo);
        setSelectedConversation(updatedConvo);
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    const textContent = inputValue.trim();
    if (!textContent && attachments.length === 0) {
      toast.warning('请输入消息或添加附件');
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
    <div
      className="w-full mx-auto border rounded-xl bg-background shadow-lg overflow-hidden"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {attachments.length > 0 && (
        <AttachmentList
          attachments={attachments}
          onRemove={(id) => {
            setAttachments((prev) => prev.filter((item) => item.id !== id));
          }}
        />
      )}

      <div className="p-4">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onPaste={handlePaste}
          placeholder="输入消息，或粘贴/拖拽图片..."
          className="max-h-[100px] resize-none border-0 focus-visible:ring-0 p-0 text-base bg-transparent shadow-none"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="icon" onClick={handleFileSelect}>
              <Paperclip className="w-4 h-4" />
            </Button>

            <RecordingButton />

            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={sending || (!inputValue.trim() && attachments.length === 0)}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? '发送中...' : '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
}
