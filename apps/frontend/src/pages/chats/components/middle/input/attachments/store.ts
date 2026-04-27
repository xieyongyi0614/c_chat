import { create } from 'zustand';

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';
export type AttachmentType = 'image' | 'file' | 'audio';

export interface Attachment {
  id: string;
  file?: File;
  filePath?: string;
  type: AttachmentType;
  mimeType: string;
  name: string;
  size: number;
  preview?: string;
  progress: number;
  status: UploadStatus;
  url?: string;
  error?: string;
}

interface AttachmentState {
  list: Attachment[];
  add: (attachment: Attachment) => void;
  addMany: (attachments: Attachment[]) => void;
  update: (id: string, patch: Partial<Attachment>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const getAttachmentType = (mimeType: string, fileName: string): AttachmentType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|m4a|aac)$/i.test(fileName)) return 'audio';
  return 'file';
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const createAttachmentFromFile = async (file: File): Promise<Attachment> => {
  const preview = file.type.startsWith('image/')
    ? await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    })
    : undefined;

  return {
    id: randomId(),
    file,
    type: getAttachmentType(file.type, file.name),
    mimeType: file.type || 'application/octet-stream',
    name: file.name,
    size: file.size,
    preview,
    progress: 0,
    status: 'idle',
  };
};

export const createAttachmentFromPath = (filePath: string): Attachment => {
  const name = filePath.split(/[/\\]/).pop() || 'unknown';
  const extension = name.split('.').pop() || '';
  const mimeType = `application/${extension}`;
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

  return {
    id: randomId(),
    filePath,
    type: isImage ? 'image' : 'file',
    mimeType,
    name,
    size: 0,
    preview: isImage ? `file://${filePath}` : undefined,
    progress: 0,
    status: 'idle',
  };
};

export const useAttachmentStore = create<AttachmentState>((set) => ({
  list: [],
  add: (attachment) => set((state) => ({ list: [...state.list, attachment] })),
  addMany: (attachments) => set((state) => ({ list: [...state.list, ...attachments] })),
  update: (id, patch) =>
    set((state) => ({
      list: state.list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),
  remove: (id) => set((state) => ({ list: state.list.filter((item) => item.id !== id) })),
  clear: () => set({ list: [] }),
}));
