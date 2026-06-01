import { PORTS } from '@c_chat/shared-config';

const SERVICE_BASE =
  process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORTS.SERVICE}`;

export const formatFileUrl = (url?: string): string => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${SERVICE_BASE}${url}`;
};
