import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/avatar';
import { getChatAvatarFallbackClass, getChatAvatarFallbackText } from '../lib/chat-avatar-style';
import { cn } from '../lib/utils';

export interface ChatAvatarProps {
  id: string;
  title?: string | null;
  avatarUrl?: string | null;
  alt?: string;
  fallback?: ReactNode;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  buttonLabel?: string;
  onClick?: () => void;
}

export function ChatAvatar({
  id,
  title,
  avatarUrl,
  alt,
  fallback,
  className,
  imageClassName,
  fallbackClassName,
  buttonLabel,
  onClick,
}: ChatAvatarProps) {
  const avatar = (
    <Avatar className={className}>
      <AvatarImage
        src={avatarUrl ?? ''}
        alt={alt ?? title ?? 'avatar'}
        className={cn('rounded-full', imageClassName)}
      />
      <AvatarFallback className={getChatAvatarFallbackClass(id, fallbackClassName)}>
        {fallback ?? getChatAvatarFallbackText(title)}
      </AvatarFallback>
    </Avatar>
  );

  if (!onClick) {
    return avatar;
  }

  return (
    <button
      type="button"
      className={cn('shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      onClick={onClick}
      aria-label={buttonLabel ?? alt ?? title ?? 'avatar'}
    >
      {avatar}
    </button>
  );
}
