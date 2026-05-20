export const formatFileUrl = (url?: string) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `http://localhost:3001${url}`;
};
