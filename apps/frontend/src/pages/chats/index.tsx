import { useRef, useState } from 'react';

import { NewChat } from './components/new-chat';
import { Main } from '@c_chat/ui';
import type { UserTypes } from '@c_chat/shared-types';
import { useChatsData } from './hooks/useChatsData';
import { useChatStore } from '@c_chat/frontend/stores';
import MiddleColumn from './components/middle/MiddleColumn';
import { transformPagination } from '@c_chat/shared-utils';
import LeftColumn, { type LeftColumnRef } from './components/left/LeftColumn';

export function Chats() {
  const { setSelectedConversation, setSelectedUserForDraft, setMessageData } = useChatStore();

  useChatsData();
  const [createConversationDialogOpened, setCreateConversationDialog] = useState(false);
  const leftColumnRef = useRef<LeftColumnRef>(null);

  // // 监听实时消息推送
  // const removeListener = ipc.onSocketMessage((data: MessageInfo) => {
  //   console.log('收到实时消息推送:', data);
  //   // 1. 如果当前正处于该会话，追加消息
  //   if (selectedConversation?.id === data.conversationId) {
  //     setMessages((prev) => {
  //       // 去重（防止重复收到）
  //       if (prev.some((m) => m.id === data.id)) return prev;
  //       return [...prev, data];
  //     });
  //   }

  //   // 2. 更新会话列表中的快照
  //   setConversationList((prev) => {
  //     const index = prev.findIndex((c) => c.id === data.conversationId);
  //     if (index > -1) {
  //       const newList = [...prev];
  //       newList[index] = {
  //         ...newList[index],
  //         lastMsgContent: data.content,
  //         lastMsgTime: data.createTime,
  //       };
  //       // 置顶逻辑
  //       const [movedItem] = newList.splice(index, 1);
  //       return [movedItem, ...newList];
  //     }
  //     return prev;
  //   });
  // });

  const handleSelectUserFromNewChat = (user: UserTypes.UserListItem) => {
    const existingConvo = leftColumnRef.current?.filterConversations.find(
      (c) => c.targetId === user.id,
    );
    if (existingConvo) {
      setSelectedConversation(existingConvo);
      setSelectedUserForDraft(null);
    } else {
      setSelectedConversation(null);
      setSelectedUserForDraft(user);
      setMessageData({ pagination: transformPagination(), list: [] });
    }
  };

  return (
    <Main fixed className="px-4 py-4 ">
      <section className="flex h-full gap-6">
        {/* LeftColumn */}
        <LeftColumn
          ref={leftColumnRef}
          openCreateConversationDialog={setCreateConversationDialog}
        />

        {/* MiddleColumn */}
        <MiddleColumn openCreateConversationDialog={setCreateConversationDialog} />
      </section>
      <NewChat
        onSelectUser={handleSelectUserFromNewChat}
        onOpenChange={setCreateConversationDialog}
        open={createConversationDialogOpened}
      />
    </Main>
  );
}
