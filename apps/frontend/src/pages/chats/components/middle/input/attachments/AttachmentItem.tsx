import { useMemo, useState } from 'react';
import { Button, Card } from '@c_chat/ui';
import { X } from 'lucide-react';
import { FileCard } from './fileCard';
import { bufferToPreviewUrl } from '@c_chat/shared-utils';
import type { FileInfoListItem } from '@c_chat/shared-types';

export function AttachmentItem({
  item,
  onRemove,
}: {
  item: FileInfoListItem;
  onRemove: (id: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewUrl = useMemo(() => {
    if (item.fileType === 'image') {
      if (item.buffer) {
        return bufferToPreviewUrl({ buffer: item.buffer, type: item.fileType });
      }
      if (item.url) {
        return item.url;
      }
      return;
    }
  }, [item.buffer, item.fileType, item.url]);
  return (
    <Card className="relative w-28 h-28 overflow-hidden group p-0">
      {/* 删除按钮 */}
      <Button
        size="icon-xs"
        variant="secondary"
        className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100"
        onClick={() => {
          onRemove(item.id);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
        }}
      >
        <X className="w-4 h-4" />
      </Button>

      {/* 内容 */}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={item.fileName}
          className="object-cover w-full h-full cursor-pointer"
          onClick={() => setPreviewOpen(true)}
        />
      ) : (
        <FileCard item={item} />
      )}

      {/* 图片预览 */}
      {previewOpen && previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewOpen(false)}
        >
          <img src={previewUrl} className="max-w-[90%] max-h-[90%] rounded-lg" />
        </div>
      )}
    </Card>
  );
}
