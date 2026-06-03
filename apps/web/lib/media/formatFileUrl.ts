import { PORTS } from '@c_chat/shared-config';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORTS.SERVICE}/api`;

const getServiceBase = () => {
  const normalized = API_BASE.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized;
};

export const formatFileUrl = (url?: string): string => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${getServiceBase()}${path}`;
};
