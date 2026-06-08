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
}: ChatAvatarProps) {
  return (
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
}
