import { memo, useState } from 'react';
import EmptyConversation from './EmptyConversation';
import { useChatStore } from '@c_chat/frontend/stores';
import { Avatar, AvatarFallback, AvatarImage, Button, cn } from '@c_chat/ui';
import {
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Phone,
  ImagePlus,
  Plus,
  Send,
  Video,
} from 'lucide-react';
import { ipc, to } from '@c_chat/shared-utils';
import { toast } from 'sonner';
import HistoryMessageList from './MessageHistoryList';
import { ConversationTypeEnum } from '@c_chat/shared-types';

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

  const [inputMessage, setInputMessage] = useState('');

  const activeTitle = (() => {
    if (selectedConversation) {
      return (
        (selectedConversation.type === 1
          ? selectedConversation.userNickname
          : selectedConversation.groupName) || selectedConversation.targetId
      );
    }
    return selectedUserForDraft?.nickname || 'Chat';
  })();

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!selectedConversation && !selectedUserForDraft) || !inputMessage.trim()) return;
    const isDraft = selectedUserForDraft && !selectedConversation;

    const type = isDraft ? ConversationTypeEnum.Single : selectedConversation?.type;
    const sendMessageParams = {
      content: inputMessage,
      type: type ?? ConversationTypeEnum.Single,
      ...(isDraft
        ? { targetId: selectedUserForDraft?.id }
        : { conversationId: selectedConversation?.id }),
    };

    const [err, res] = await to(ipc.SendMessage(sendMessageParams));
    console.log('Sent message:', res);
    if (err) {
      console.error('Failed to send message:', err);
      toast.error('发送消息失败');
      return;
    }

    setInputMessage('');

    setMessageData((prev) => ({ ...prev, list: [...prev.list, res] }));

    if (isDraft && res.conversationId) {
      const newConvo = {
        id: res.conversationId,
        type: res.type ?? ConversationTypeEnum.Single,
        targetId: selectedUserForDraft.id,
        lastMsgContent: inputMessage,
        lastMsgTime: Number(res.createTime),
        updateTime: Number(res.createTime),
        createTime: Number(res.createTime),
        userNickname: selectedUserForDraft.nickname ?? '',
        userAvatar: selectedUserForDraft.avatarUrl ?? '',
        groupName: undefined,
        groupAvatar: undefined,
        lastReadMessageId: 0,
      };

      setSelectedConversation(newConvo);
      setSelectedUserForDraft(null);

      upsertAndPinConversation(newConvo);
      return;
    }

    // 如果是现有会话发送消息，更新会话列表中的该项
    if (selectedConversation && res.conversationId === selectedConversation.id) {
      const updatedConvo = {
        ...selectedConversation,
        lastMsgContent: inputMessage,
        lastMsgTime: res.createTime,
        updateTime: res.createTime,
      };

      upsertAndPinConversation(updatedConvo);

      // 同时更新选中的会话状态
      setSelectedConversation(updatedConvo);
    }
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
                src={
                  selectedConversation?.type === 1
                    ? selectedConversation?.groupAvatar
                    : selectedConversation?.userAvatar
                }
                alt="@shadcn"
                className="grayscale"
              />
              <AvatarFallback>
                {selectedConversation?.userNickname?.toUpperCase()?.slice(0, 2)}
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
        <form className="flex w-full flex-none gap-2" onSubmit={handleSendMessage}>
          <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-card px-2 py-1 focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden lg:gap-4">
            <div className="space-x-1">
              <Button size="icon" type="button" variant="ghost" className="h-8 rounded-md">
                <Plus size={20} className="stroke-muted-foreground" />
              </Button>
              <Button
                size="icon"
                type="button"
                variant="ghost"
                className="hidden h-8 rounded-md lg:inline-flex"
              >
                <ImagePlus size={20} className="stroke-muted-foreground" />
              </Button>
              <Button
                size="icon"
                type="button"
                variant="ghost"
                className="hidden h-8 rounded-md lg:inline-flex"
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
        </form>
      </div>
    </div>
  );
};

export default memo(MiddleColumn);
