import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** chatMessage */
export const DEFAULT_SCROLL_TO_BOTTOM_EVENT = 'chat:scroll-to-bottom';
export const chatMessageScrollToBottom = () => {
  window.dispatchEvent(new Event(DEFAULT_SCROLL_TO_BOTTOM_EVENT));
};
