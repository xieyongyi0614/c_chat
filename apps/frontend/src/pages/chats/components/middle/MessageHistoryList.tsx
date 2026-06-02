import { memo, useEffect, useState } from 'react';
import { ChatMessageScrollArea } from '@c_chat/ui';
import { useChatStore, useMessageStore } from '@c_chat/frontend/stores';
import { ConversationType } from '@c_chat/shared-types';
import { ipc, to } from '@c_chat/shared-utils';
import { useShallow } from 'zustand/react/shallow';
import MessageGroup from './message/MessageGroup';
import type { SenderProfile } from './message/senderProfile';

interface MessageHistoryListProps {
  loadOlderMessages: () => Promise<boolean>;
  historyState: {
    isLoadingLatest: boolean;
    isLoadingOlder: boolean;
    hasMoreOlder: boolean;
  };
}

const MessageHistoryList = ({ historyState, loadOlderMessages }: MessageHistoryListProps) => {
  const dateKeys = useMessageStore(useShallow((s) => Array.from(s.groups.keys()).reverse()));
  const dataConversationId = useMessageStore((s) => s.dataConversationId);
  const selectedConversation = useChatStore((s) => s.selectedConversation);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>({});
  const msgCount = useMessageStore((s) =>
    Object.values(s.msgMap).reduce((count, messages) => count + messages.length, 0),
  );
  const isGroupConversation = selectedConversation?.type === ConversationType.Group;

  useEffect(() => {
    if (!isGroupConversation || !selectedConversation?.targetId) {
      setSenderProfiles({});
      return;
    }

    let disposed = false;
    const loadGroupMembers = async () => {
      const [err, res] = await to(ipc.GetGroupDetail({ groupId: selectedConversation.targetId }));
      if (disposed || err) return;

      const profiles =
        res.members?.reduce<Record<string, SenderProfile>>((acc, member) => {
          if (member.userId) {
            acc[member.userId] = {
              id: member.userId,
              nickname: member.nickname || member.alias || member.userId,
              avatarUrl: member.avatarUrl ?? '',
            };
          }
          return acc;
        }, {}) ?? {};
      setSenderProfiles(profiles);
    };

    loadGroupMembers();
    return () => {
      disposed = true;
    };
  }, [isGroupConversation, selectedConversation?.targetId]);
  console.log(dateKeys, 'dateKeys');

  return (
    <div className="flex size-full flex-1">
      <ChatMessageScrollArea
        key="chat-message-scroll-area"
        conversationKey={dataConversationId}
        messageCount={msgCount}
        hasMoreOlder={historyState.hasMoreOlder}
        isLoadingOlder={historyState.isLoadingOlder}
        isLoadingLatest={historyState.isLoadingLatest}
        loadOlderMessages={loadOlderMessages}
      >
        {dateKeys.map((dateKey) => (
          <MessageGroup
            key={dateKey}
            dateKey={dateKey}
            isGroupConversation={isGroupConversation}
            senderProfiles={senderProfiles}
          />
        ))}
      </ChatMessageScrollArea>
    </div>
  );
};

export default memo(MessageHistoryList);
