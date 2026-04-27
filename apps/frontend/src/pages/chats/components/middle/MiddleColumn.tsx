import { memo, useRef, useState } from 'react';
import EmptyConversation from './EmptyConversation';
import { useChatStore } from '@c_chat/frontend/stores';
import { Avatar, AvatarFallback, AvatarImage, Button, cn } from '@c_chat/ui';
import { ArrowLeft, MoreVertical, Paperclip, Phone, ImagePlus, Send, Video } from 'lucide-react';
import { ipc, to } from '@c_chat/shared-utils';
import { toast } from 'sonner';
import HistoryMessageList from './MessageHistoryList';
import { ChatInput } from './input/ChatInput';

interface RightSideProps {
  openCreateConversationDialog: (open: boolean) => void;
}

const MiddleColumn = (props: RightSideProps) => {
  const { openCreateConversationDialog } = props;

  const {
    selectedConversation,
    selectedUserForDraft,
    setSelectedUserForDraft,
    setMessageData,
    setSelectedConversation,
    upsertAndPinConversation,
  } = useChatStore();

  // const [messageData, setMessageData] = useState<MessageInfo[]>([]);

  // const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [inputMessage, setInputMessage] = useState('');

  const activeTitle = (() => {
    if (selectedConversation) {
      return selectedConversation.targetName;
    }
    return selectedUserForDraft?.nickname || '无';
  })();

  // const uploadFileToServer = async (file: File) => {
  //   const uploadUrl = 'http://localhost:3001/api/upload/single';
  //   const formData = new FormData();
  //   formData.append('file', file);

  //   const response = await fetch(uploadUrl, {
  //     method: 'POST',
  //     body: formData,
  //   });

  //   if (!response.ok) {
  //     throw new Error(`上传失败：${response.statusText}`);
  //   }

  //   const data = await response.json();
  //   if (!data?.url) {
  //     throw new Error('上传结果不包含文件地址');
  //   }

  //   return data.url as string;
  // };

  const sendMessageContent = async (content: string, messageType = 0) => {
    if ((!selectedConversation && !selectedUserForDraft) || !content.trim()) return;
    const isDraft = selectedUserForDraft && !selectedConversation;

    const sendMessageParams = {
      content,
      type: messageType,
      ...(isDraft
        ? { targetId: selectedUserForDraft?.id }
        : { conversationId: selectedConversation?.id }),
    };

    const [err, res] = await to(ipc.SendMessage(sendMessageParams));
    if (err) {
      console.error('Failed to send message:', err);
      toast.error('发送消息失败');
      return;
    }
    const { messageInfo, newConvo } = res;

    setMessageData((prev) => ({ ...prev, list: [...prev.list, messageInfo] }));

    if (isDraft && newConvo) {
      setSelectedConversation(newConvo);
      upsertAndPinConversation(newConvo);
      return;
    }

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
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;
    await sendMessageContent(inputMessage, 0);
    setInputMessage('');
  };

  // const handleLinkClick = async () => {
  //   const input = window.prompt('请输入链接地址');
  //   if (!input?.trim()) return;
  //   const url = input.trim().startsWith('http') ? input.trim() : `https://${input.trim()}`;
  //   await sendMessageContent(url, 3);
  // };

  // const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   event.target.value = '';
  //   if (!file) return;

  //   toast('正在上传图片...');
  //   try {
  //     const url = await uploadFileToServer(file);
  //     await sendMessageContent(url, 1);
  //     toast.success('图片发送成功');
  //   } catch (error) {
  //     console.error(error);
  //     toast.error('图片上传失败');
  //   }
  // };

  const handleFileSelected = async () => {
    const res = await ipc.SelectFiles({});
    console.log(res, 'res');
    // const file = event.target.files?.[0];
    // event.target.value = '';
    // if (!file) return;
    // toast('正在上传文件...');
    // try {
    //   const url = await uploadFileToServer(file);
    //   await sendMessageContent(url, 2);
    //   toast.success('文件发送成功');
    // } catch (error) {
    //   console.error(error);
    //   toast.error('文件上传失败');
    // }
  };

  if (!selectedConversation && !selectedUserForDraft) {
    return (
      <EmptyConversation openCreateConversationDialog={() => openCreateConversationDialog(true)} />
    );
  }

  return (
    <div
      className={cn(
        'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col border bg-background shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
        selectedUserForDraft && 'start-0 flex',
      )}
    >
      {/* Top Part */}
      <div className="mb-1 flex flex-none justify-between bg-card p-4 shadow-lg sm:rounded-t-md">
        {/* Left */}
        <div className="flex gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="-ms-2 h-full sm:hidden"
            onClick={() => {
              setSelectedUserForDraft(null);
            }}
          >
            <ArrowLeft className="rtl:rotate-180" />
          </Button>
          <div className="flex items-center gap-2 lg:gap-4">
            <Avatar className="size-9 lg:size-11">
              <AvatarImage
                src={selectedConversation?.targetAvatar}
                alt="@shadcn"
                className="grayscale"
              />
              <AvatarFallback>
                {selectedConversation?.targetName?.toUpperCase()?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="col-start-2 row-span-2 text-sm font-medium lg:text-base">
                {activeTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="-me-1 flex items-center gap-1 lg:gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
          >
            <Video size={22} className="stroke-muted-foreground" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
          >
            <Phone size={22} className="stroke-muted-foreground" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6"
          >
            <MoreVertical className="stroke-muted-foreground sm:size-5" />
          </Button>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4">
        <HistoryMessageList />
        <ChatInput />

        {/* <form className="flex w-full flex-none gap-2" onSubmit={handleSendMessage}>
          <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-card px-2 py-1 focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden lg:gap-4">
            <div className="space-x-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelected}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelected}
              />
              <Button
                size="icon"
                type="button"
                variant="ghost"
                className="h-8 rounded-md"
                onClick={handleLinkClick}
                title="发送链接"
                aria-label="插入链接"
              >
                <Link2 size={20} className="stroke-muted-foreground" />
              </Button>
              <Button
                size="icon"
                type="button"
                variant="ghost"
                className="hidden h-8 rounded-md lg:inline-flex"
                onClick={handleFileSelected}
                title="上传图片"
                aria-label="上传图片"
              >
                <ImagePlus size={20} className="stroke-muted-foreground" />
              </Button>
              <Button
                size="icon"
                type="button"
                variant="ghost"
                className="hidden h-8 rounded-md lg:inline-flex"
                onClick={() => fileInputRef.current?.click()}
                title="上传文件"
                aria-label="上传文件"
              >
                <Paperclip size={20} className="stroke-muted-foreground" />
              </Button>
            </div>
            <label className="flex-1">
              <span className="sr-only">Chat Text Box</span>
              <input
                type="text"
                placeholder="Type your messages..."
                className="h-8 w-full bg-inherit focus-visible:outline-hidden"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
              />
            </label>

            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" type="submit">
              <Send size={20} />
            </Button>
          </div>

          <Button className="h-full sm:hidden" type="submit">
            <Send size={18} /> Send
          </Button>
        </form> */}
      </div>
    </div>
  );
};

export default memo(MiddleColumn);
