import { memo, Fragment } from 'react';
import dayjs from 'dayjs';
import { useChatStore, useMessageStore, useUserStore } from '@c_chat/frontend/stores';
import MessageItem from './message/MessageItem';
import MessageGroup from './message/MessageGroup';

const MessageHistoryList = () => {
  // const msgGrouped = useChatStore((s) => s.msgGrouped);
  const msgGroups = useMessageStore((s) => s.groups);

  // const lastReadMessageId = useChatStore((s) => s.selectedConversation?.lastReadMessageId);
  // const userId = useUserStore((s) => s.userInfo?.id);
  // const dateKeys = Object.keys(msgGrouped).sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf());

  console.log('message list render');

  return (
    <div className="flex size-full flex-1">
      <div className="chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden">
        <div className="chat-flex flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4">
          {/* {dateKeys.map((dateKey) => (
            <Fragment key={dateKey}>
              {msgGrouped[dateKey].map((msg) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  isRead={
                    msg.senderId === userId ||
                    (!!lastReadMessageId && lastReadMessageId >= msg.msgId)
                  }
                />
              ))}
              <div className="text-center text-xs">{dateKey}</div>
            </Fragment>
          ))} */}
          {msgGroups.map((group) => (
            <MessageGroup key={group.dateKey} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
};
export default memo(MessageHistoryList);
