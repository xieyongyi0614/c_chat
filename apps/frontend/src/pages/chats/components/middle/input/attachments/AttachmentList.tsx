import type { FileInfoListItem } from '@c_chat/shared-types';
import { AttachmentItem } from './AttachmentItem';

export function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: FileInfoListItem[];
  onRemove: (id: string) => void;
}) {
  console.log('AttachmentList', attachments);
  return (
    <div className="flex flex-wrap gap-3 p-2">
      {attachments.map((item) => (
        <AttachmentItem key={item.id} item={item} onRemove={onRemove} />
      ))}
    </div>
  );
}
