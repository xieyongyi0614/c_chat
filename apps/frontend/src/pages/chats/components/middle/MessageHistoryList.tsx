import { memo, Fragment, useMemo } from 'react';
import dayjs from 'dayjs';
import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';

const MessageHistoryList = () => {
  const { userInfo } = useUserStore();

  const { messageData } = useChatStore();

  const processedData = useMemo(() => {
    if (!messageData.list.length) {
      return { groupedMessages: {}, sortedDateKeys: [] };
    }

    const sortedAllMessages = [...messageData.list].sort(
      (a, b) => Number(b.createTime) - Number(a.createTime),
    );

    const groups: Record<string, LocalMessageListItem[]> = {};
    const dateSeen = new Set<string>();

    sortedAllMessages.forEach((msg) => {
      const dateKey = dayjs(Number(msg.createTime)).format('D MMM, YYYY');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
        dateSeen.add(dateKey);
      }
      groups[dateKey].push(msg);
    });

    const sortedDateKeys = Array.from(dateSeen).sort((dateA, dateB) => {
      return dayjs(dateB, 'D MMM, YYYY').valueOf() - dayjs(dateA, 'D MMM, YYYY').valueOf();
    });

    return { groupedMessages: groups, sortedDateKeys };
  }, [messageData.list]);

  return (
    <div className="flex size-full flex-1">
      <div className="chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden">
        <div className="chat-flex flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4">
          {processedData.sortedDateKeys.map((dateKey) => (
            <Fragment key={dateKey}>
              {processedData.groupedMessages[dateKey].map((msg, index) => (
                <div
                  key={`${msg.senderId}-${msg.createTime}-${index}`}
                  className={cn(
                    'chat-box max-w-72 px-3 py-2 wrap-break-word shadow-lg',
                    msg.senderId === userInfo?.id
                      ? 'self-end rounded-[16px_16px_0_16px] bg-primary/90 text-primary-foreground/75'
                      : 'self-start rounded-[16px_16px_16px_0] bg-muted',
                  )}
                >
                  {msg.content}
                  <span
                    className={cn(
                      'mt-1 block text-xs font-light text-foreground/75 italic',
                      msg.senderId === userInfo?.id && 'text-end text-primary-foreground/85',
                    )}
                  >
                    {dayjs(Number(msg.createTime)).format('HH:mm')}
                  </span>
                </div>
              ))}
              <div className="text-center text-xs">{dateKey}</div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
export default memo(MessageHistoryList);
