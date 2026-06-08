import { PORTS } from '@c_chat/shared-config';

export const formatFileUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `http://localhost:${PORTS.SERVICE}${url}`;
};
