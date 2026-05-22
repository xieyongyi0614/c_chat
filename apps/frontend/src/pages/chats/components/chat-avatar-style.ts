import { cn } from '@c_chat/ui';

const TELEGRAM_AVATAR_COLORS = [
  'bg-sky-500 text-white',
  'bg-cyan-500 text-white',
  'bg-blue-500 text-white',
  'bg-violet-500 text-white',
  'bg-fuchsia-500 text-white',
  'bg-rose-500 text-white',
  'bg-orange-500 text-white',
  'bg-emerald-500 text-white',
] as const;

export function getChatAvatarColorClass(seed?: string | null) {
  const text = seed?.trim();
  if (!text) return TELEGRAM_AVATAR_COLORS[0];

  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) % TELEGRAM_AVATAR_COLORS.length;
  }

  return TELEGRAM_AVATAR_COLORS[hash];
}

export function getChatAvatarFallbackClass(seed?: string | null, className?: string) {
  return cn(getChatAvatarColorClass(seed), 'font-semibold', className);
}
