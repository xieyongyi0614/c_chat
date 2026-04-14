import { useEffect, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  MoreVertical,
  Edit,
  Paperclip,
  Phone,
  ImagePlus,
  Plus,
  Search as SearchIcon,
  Send,
  Video,
  MessagesSquare,
} from 'lucide-react';

import { NewChat } from './components/new-chat';
import { Avatar, AvatarFallback, Button, cn, Main, ScrollArea, Separator } from '@c_chat/ui';
import { ipc, to } from '@c_chat/shared-utils';
import { useUserStore } from '@c_chat/frontend/stores/userStore';
import ProtobufRoot from '@c_chat/shared-protobuf';
import type { UserTypes } from '@c_chat/shared-types';

type ConversationInfo = ProtobufRoot.ConversationInfo;
type MessageInfo = ProtobufRoot.MessageInfo;
export function Chats() {
  const [search, setSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationInfo | null>(null);
  const [selectedUserForDraft, setSelectedUserForDraft] = useState<UserTypes.UserListItem | null>(
    null,
  );
  const [mobileSelectedConversation, setMobileSelectedConversation] =
    useState<ConversationInfo | null>(null);
  const [createConversationDialogOpened, setCreateConversationDialog] = useState(false);
  const [conversationList, setConversationList] = useState<ConversationInfo[]>([]);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const { userInfo } = useUserStore();

  useEffect(() => {
    if (userInfo?.id) {
      fetchLocalConversationList();
      fetchConversationList();
    }
  }, [userInfo?.id]);

  useEffect(() => {
    if (selectedConversation) {
      fetchLocalMessageHistory(selectedConversation.id);
      fetchMessageHistory(selectedConversation.id);
      setSelectedUserForDraft(null);
    } else if (!selectedUserForDraft) {
      setMessages([]);
    }
  }, [selectedConversation, selectedUserForDraft]);

  const fetchLocalConversationList = async () => {
    const res = await ipc.GetLocalConversationList();
    if (res && res.list) setConversationList(res.list);
  };

  const fetchConversationList = async () => {
    const [err, res] = await to(ipc.GetConversationList({ pagination: { page: 1, pageSize: 50 } }));
    if (err) {
      console.error('Failed to fetch conversation list:', err);
      return;
    }
    setConversationList(res.list);
    console.log(res, 'fetchConversationList');
  };

  const fetchLocalMessageHistory = async (conversationId: string) => {
    const res = await ipc.GetLocalMessageHistory({ conversation_id: conversationId });
    if (res && res.list) setMessages(res.list);
  };

  const fetchMessageHistory = async (conversationId: string) => {
    try {
      const res = await ipc.GetMessageHistory({
        conversation_id: conversationId,
        pagination: { page: 1, pageSize: 50 },
      });
      setMessages(res.list);
    } catch (error) {
      console.error('Failed to fetch message history:', error);
    }
  };

  const handleSelectUserFromNewChat = (user: UserTypes.UserListItem) => {
    const existingConvo = conversationList.find((c) => c.targetId === user.id);
    if (existingConvo) {
      setSelectedConversation(existingConvo);
      setSelectedUserForDraft(null);
    } else {
      setSelectedConversation(null);
      setSelectedUserForDraft(user);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!selectedConversation && !selectedUserForDraft) || !inputMessage.trim()) return;

    let convoId = selectedConversation?.id;

    // 如果是临时会话，先创建
    if (!convoId && selectedUserForDraft) {
      try {
        const newConvo = await ipc.CreateConversation({ targetId: selectedUserForDraft.id });
        convoId = newConvo.id;
        setSelectedConversation(newConvo);
        setSelectedUserForDraft(null);
        fetchConversationList();
      } catch (error) {
        console.error('Failed to create conversation on first message:', error);
        return;
      }
    }

    try {
      const res = await ipc.SendMessage({
        conversation_id: convoId!,
        content: inputMessage,
        type: 0, // Text
      });
      console.log('Sent message:', res);
      setInputMessage('');
      setMessages((prev) => [...prev, res]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Filtered data based on the search query
  const filteredChatList = conversationList.filter(({ targetId }) =>
    targetId?.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const groupedMessages = messages.reduce((acc: Record<string, MessageInfo[]>, obj) => {
    const key = dayjs(Number(obj.createTime)).format('D MMM, YYYY');
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});

  const activeTargetId = selectedConversation?.targetId || selectedUserForDraft?.id || '';
  const activeTitle = selectedConversation?.targetId || selectedUserForDraft?.nickname || 'Chat';

  return (
    <Main fixed className="px-4 py-4 ">
      <section className="flex h-full gap-6">
        {/* Left Side */}
        <div className="flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80">
          <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none">
            <div className="flex items-center justify-between py-2">
              <div className="flex gap-2">
                <h1 className="text-2xl font-bold">消息</h1>
                <MessagesSquare size={20} />
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCreateConversationDialog(true)}
                className="rounded-lg"
              >
                <Edit size={24} className="stroke-muted-foreground" />
              </Button>
            </div>

            <label
              className={cn(
                'focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden',
                'flex h-10 w-full items-center space-x-0 rounded-md border border-border ps-2',
              )}
            >
              <SearchIcon size={15} className="me-2 stroke-slate-500" />
              <span className="sr-only">Search</span>
              <input
                type="text"
                className="w-full flex-1 bg-inherit text-sm focus-visible:outline-hidden"
                placeholder="Search chat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <ScrollArea className="-mx-3 h-full overflow-auto p-3" type="auto">
            {filteredChatList.map((convo) => {
              const { id, lastMsgContent, lastMsgTime, targetId } = convo;
              return (
                <Fragment key={id}>
                  <button
                    type="button"
                    className={cn(
                      'group hover:bg-accent hover:text-accent-foreground',
                      `flex w-full rounded-md px-2 py-2 text-start text-sm`,
                      selectedConversation?.id === id && 'sm:bg-muted',
                    )}
                    onClick={() => {
                      setSelectedConversation(convo);
                      setMobileSelectedConversation(convo);
                      setSelectedUserForDraft(null);
                    }}
                  >
                    <div className="flex gap-2">
                      <Avatar>
                        <AvatarFallback>{targetId?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="col-start-2 row-span-2 font-medium">{targetId}</span>
                        <span className="col-start-2 row-span-2 row-start-2 line-clamp-2 text-ellipsis text-muted-foreground group-hover:text-accent-foreground/90">
                          {lastMsgContent || 'No messages'}
                        </span>
                      </div>
                    </div>
                  </button>
                  <Separator className="my-1" />
                </Fragment>
              );
            })}
          </ScrollArea>
        </div>

        {/* Right Side */}
        {selectedConversation || selectedUserForDraft ? (
          <div
            className={cn(
              'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col border bg-background shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
              (mobileSelectedConversation || selectedUserForDraft) && 'start-0 flex',
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
                    setMobileSelectedConversation(null);
                    setSelectedUserForDraft(null);
                  }}
                >
                  <ArrowLeft className="rtl:rotate-180" />
                </Button>
                <div className="flex items-center gap-2 lg:gap-4">
                  <Avatar className="size-9 lg:size-11">
                    <AvatarFallback>{activeTargetId.slice(0, 2)}</AvatarFallback>
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
              <div className="flex size-full flex-1">
                <div className="chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden">
                  <div className="chat-flex flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4">
                    {groupedMessages &&
                      Object.keys(groupedMessages).map((key) => (
                        <Fragment key={key}>
                          {groupedMessages[key].map((msg, index) => (
                            <div
                              key={`${msg.senderId}-${msg.createTime}-${index}`}
                              className={cn(
                                'chat-box max-w-72 px-3 py-2 wrap-break-word shadow-lg',
                                msg.senderId === userInfo?.id
                                  ? 'self-end rounded-[16px_16px_0_16px] bg-primary/90 text-primary-foreground/75'
                                  : 'self-start rounded-[16px_16px_16px_0] bg-muted',
                              )}
                            >
                              {msg.content}{' '}
                              <span
                                className={cn(
                                  'mt-1 block text-xs font-light text-foreground/75 italic',
                                  msg.senderId === userInfo?.id &&
                                    'text-end text-primary-foreground/85',
                                )}
                              >
                                {dayjs(Number(msg.createTime)).format('h:mm A')}
                              </span>
                            </div>
                          ))}
                          <div className="text-center text-xs">{key}</div>
                        </Fragment>
                      ))}
                  </div>
                </div>
              </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:inline-flex"
                    type="submit"
                  >
                    <Send size={20} />
                  </Button>
                </div>
                <Button className="h-full sm:hidden" type="submit">
                  <Send size={18} /> Send
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col justify-center rounded-md border bg-card shadow-xs sm:static sm:z-auto sm:flex',
            )}
          >
            <div className="flex flex-col items-center space-y-6">
              <div className="flex size-16 items-center justify-center rounded-full border-2 border-border">
                <MessagesSquare className="size-8" />
              </div>
              <div className="space-y-2 text-center">
                <h1 className="text-xl font-semibold">Your messages</h1>
                <p className="text-sm text-muted-foreground">Send a message to start a chat.</p>
              </div>
              <Button onClick={() => setCreateConversationDialog(true)}>Send message</Button>
            </div>
          </div>
        )}
      </section>
      <NewChat
        onSelectUser={handleSelectUserFromNewChat}
        onOpenChange={setCreateConversationDialog}
        open={createConversationDialogOpened}
      />
    </Main>
  );
}
