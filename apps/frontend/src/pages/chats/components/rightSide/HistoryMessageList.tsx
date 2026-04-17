import { memo, Fragment, useMemo } from 'react';
import dayjs from 'dayjs';
import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';

const HistoryMessageList = () => {
  const { userInfo } = useUserStore();

  const { messageData } = useChatStore();
  const groupedMessages = useMemo(
    () =>
      messageData.list.reduce((acc: Record<string, LocalMessageListItem[]>, obj) => {
        const key = dayjs(Number(obj.createTime)).format('D MMM, YYYY');
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].unshift(obj);
        return acc;
      }, {}),
    [messageData.list],
  );
  return (
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
                    {msg.content}
                    <span
                      className={cn(
                        'mt-1 block text-xs font-light text-foreground/75 italic',
                        msg.senderId === userInfo?.id && 'text-end text-primary-foreground/85',
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
  );
};
export default memo(HistoryMessageList);
