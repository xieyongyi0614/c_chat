import { memo } from 'react';
import type { TextMessageProps } from './types';

function TextMessage({ content }: TextMessageProps) {
  return <span className="whitespace-pre-wrap break-words">{content}</span>;
}

export default memo(TextMessage);
