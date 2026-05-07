import { memo } from 'react';

interface TextMessageProps {
  content: string;
}

const TextMessage = ({ content }: TextMessageProps) => {
  return <span className="whitespace-pre-wrap break-words">{content}</span>;
};

export default memo(TextMessage);
