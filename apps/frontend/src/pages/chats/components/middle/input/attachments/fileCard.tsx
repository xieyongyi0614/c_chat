import type { FileInfoListItem } from '@c_chat/shared-types';
import { FileIcon } from 'lucide-react';

export function FileCard({ item }: { item: FileInfoListItem }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-xs p-2">
      <FileIcon className="w-6 h-6 mb-1" />
      <span className="line-clamp-2 text-center break-all">{item.fileName}</span>
      <span className="text-muted-foreground text-[10px]">
        {(item.fileSize / 1024).toFixed(1)} KB
      </span>
    </div>
  );
}
