import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/avatar';
import { Button } from '../../components/button';

interface ChatMessageOwnProps {
  isMe: boolean;
}

type ChatMessageRowProps = ComponentProps<'div'> & ChatMessageOwnProps;

function ChatMessageRow({ isMe, className, ...props }: ChatMessageRowProps) {
  return (
    <div
      className={cn(
        'flex w-full items-end gap-2',
        isMe ? 'justify-end' : 'justify-start',
        className,
      )}
      {...props}
    />
  );
}

type ChatMessageStackProps = ComponentProps<'div'> & ChatMessageOwnProps;

function ChatMessageStack({ isMe, className, ...props }: ChatMessageStackProps) {
  return (
    <div
      className={cn(
        'relative flex max-w-[70%] flex-col',
        isMe ? 'items-end' : 'items-start',
        className,
      )}
      {...props}
    />
  );
}

function ChatMessageSenderName({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn('max-w-full truncate px-1 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

interface ChatMessageBubbleProps extends ComponentProps<'div'>, ChatMessageOwnProps {
  isMedia?: boolean;
  isVideo?: boolean;
  variant?: 'default' | 'desktop';
}

function ChatMessageBubble({
  isMe,
  isMedia,
  isVideo,
  className,
  ...props
}: ChatMessageBubbleProps) {
  return (
    <div
      className={cn(
        'rounded-2xl py-2 text-sm shadow-sm',
        isMe ? 'rounded-br-sm pl-3 pr-2' : 'rounded-bl-sm bg-muted pl-2 pr-3 text-foreground',
        isMedia && 'relative group shadow-none',
        isVideo && 'bg-transparent p-0 shadow-none',
        className,
      )}
      {...props}
    />
  );
}

function ChatMessageMeta({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-1 px-1 text-[11px] text-muted-foreground', className)}
      {...props}
    />
  );
}

interface ChatMessageAvatarProps extends ComponentProps<'button'> {
  avatarUrl?: string;
  fallback: ReactNode;
  senderName: string;
}

function ChatMessageAvatar({
  avatarUrl,
  fallback,
  senderName,
  className,
  ...props
}: ChatMessageAvatarProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-9 shrink-0 rounded-full p-0', className)}
      {...props}
    >
      <Avatar className="size-9">
        <AvatarImage src={avatarUrl} alt={senderName} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </Button>
  );
}

export {
  ChatMessageAvatar,
  ChatMessageBubble,
  ChatMessageMeta,
  ChatMessageRow,
  ChatMessageSenderName,
  ChatMessageStack,
};
export { ChatMessageScrollArea } from './_components/ChatMessageScrollArea';

export {
  AudioMessage,
  ChatMessageContent,
  FileMessage,
  ImageGroup,
  MessageDate,
  MessageStatusIcon,
  TextMessage,
  VideoMessage,
} from './_components/msgTypes';
export type {
  AudioMessageProps,
  AudioPlaybackState,
  ChatMessageAudioControls,
  ChatMessageContentProps,
  ChatMessageDateProps,
  ChatMessageFileResolver,
  ChatMessageMediaItem,
  ChatMessageRetryProps,
  ChatMessageStatusProps,
  FileMessageProps,
  ImageGroupProps,
  ImagePreviewProps,
  TextMessageProps,
  VideoMessageProps,
} from './_components/msgTypes';
