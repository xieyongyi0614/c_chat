import { useState } from 'react';
import type { ClipboardEvent, DragEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button, Textarea } from '@c_chat/ui';

import { AttachmentList } from './attachments/AttachmentList';
import { EmojiPicker } from './EmojiPicker';
import { getSelectFileInfoByFile, ipc, to } from '@c_chat/shared-utils';
import { toast } from 'sonner';
import { useChatStore, useMessageStore } from '@c_chat/frontend/stores';
import { MessageTypeEnum, type FileInfoListItem } from '@c_chat/shared-types';

export function ChatInput() {
  const {
    selectedConversation,
    selectedUserForDraft,
    setMessageData,
    setSelectedConversation,
    upsertAndPinConversation,
  } = useChatStore();
  const { addMsg } = useMessageStore();

  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<FileInfoListItem[]>([]);
  // const { list, addMany } = useAttachmentStore();

  // const handleAddFiles = async (files: File[]) => {
  //   const attachments = await Promise.all(files.map(createAttachmentFromFile));
  //   // addMany(attachments);
  // };

  const handleFileSelect = async () => {
    const res = await ipc.SelectFiles({});
    console.log(res, 'res');
    setAttachments((state) => [...state, ...res]);
  };

  // const handleSelectNativeFiles = async () => {
  //   try {
  //     const filePaths = await selectFilesByNativeDialog();
  //     const attachments = filePaths.map(createAttachmentFromPath);
  //     addMany(attachments);
  //   } catch (error) {
  //     // setHint(`本地选择失败：${(error as Error).message}`);
  //   }
  // };

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

  const sendMessageContent = async (
    content: string,
    files?: FileInfoListItem[],
    messageType = MessageTypeEnum.Text,
  ) => {
    if (!selectedConversation && !selectedUserForDraft) return;
    const isDraft = selectedUserForDraft && !selectedConversation;

    const sendMessageParams = {
      content,
      type: messageType,
      files,
      ...(isDraft
        ? { targetId: selectedUserForDraft?.id }
        : { conversationId: selectedConversation?.id }),
    };

    const [err, messageInfo] = await to(ipc.SendMessage(sendMessageParams));
    if (err) {
      console.error('Failed to send message:', err);
      toast.error('发送消息失败');
      return;
    }
    addMsg(messageInfo);

    // setMessageData((prev) => ({ ...prev, list: [...prev.list, messageInfo] }));
    // if (isDraft && newConvo) {
    //   setSelectedConversation(newConvo);
    //   upsertAndPinConversation(newConvo);
    //   return;
    // }

    if (selectedConversation && messageInfo.conversationId === selectedConversation.id) {
      const updatedConvo = {
        ...selectedConversation,
        lastMsgContent: content,
        lastMsgTime: messageInfo.createTime,
        updateTime: messageInfo.createTime,
      };

      upsertAndPinConversation(updatedConvo);
      setSelectedConversation(updatedConvo);
    }
    return true;
  };

  const handleSubmit = async () => {
    const textContent = inputValue.trim();
    if (!textContent && attachments.length === 0) {
      toast.warning('请输入消息或添加附件');
      return;
    }

    let messageType = MessageTypeEnum.Text;
    setSending(true);

    if (attachments.length > 0) {
      if (attachments.length === 1 && attachments[0].fileType === 'image') {
        messageType = MessageTypeEnum.Image;
      } else {
        /** 多个附件，处理成多条消息 */
      }
    }

    const res = await sendMessageContent(inputValue, attachments, messageType);
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
            {/* <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSelectNativeFiles}
              title="Electron 本地文件"
            >
              <UploadCloud className="w-4 h-4" />
            </Button> */}
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
