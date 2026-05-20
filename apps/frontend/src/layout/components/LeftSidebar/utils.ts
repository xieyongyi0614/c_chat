export const getInitials = (value?: string | null) => {
  const text = value?.trim();
  if (!text) return 'ME';
  return text.slice(0, 2).toUpperCase();
};
