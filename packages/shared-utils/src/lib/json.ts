export function safeJsonStringify(obj: any): string | null {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('JSON.stringify failed:', error);
    return null;
  }
}

export function safeJsonParse<T = unknown>(text: string, fallback?: T): T | undefined {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
