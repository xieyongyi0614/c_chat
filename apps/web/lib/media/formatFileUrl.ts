import { PORTS } from '@c_chat/shared-config';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORTS.SERVICE}/api`;
const FILE_BASE = process.env.NEXT_PUBLIC_FILE_BASE_URL;

const getServiceBase = () => {
  const normalized = (FILE_BASE || API_BASE).replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized;
};

export const formatFileUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${getServiceBase()}${path}`;
};
