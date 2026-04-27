import { X, Paperclip } from 'lucide-react';
import { useAttachmentStore } from './attachments/store';

const formatSize = (size: number) => {
  if (size >= 1024 * 1024) return `${Math.round(size / 1024 / 1024)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
};

export function AttachmentList() {
  const { list, remove } = useAttachmentStore();

  if (list.length === 0) return null;

  return (
    <div className="border-b border-input/80 bg-surface p-3">
      <div className="flex flex-wrap gap-3">
        {list.map((attachment) => (
          <div
            key={attachment.id}
            className="w-full rounded-xl border border-border bg-muted p-3 sm:w-[260px]"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-background text-muted-foreground">
                <Paperclip size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{attachment.name}</div>
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => remove(attachment.id)}
                  >
                    删除
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{attachment.type.toUpperCase()}</span>
                  <span>{attachment.size ? formatSize(attachment.size) : '未知大小'}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full ${
                      attachment.status === 'done'
                        ? 'bg-emerald-500'
                        : attachment.status === 'error'
                          ? 'bg-destructive'
                          : 'bg-primary'
                    }`}
                    style={{ width: `${attachment.progress}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {attachment.status === 'uploading' && `上传中 ${attachment.progress}%`}
                  {attachment.status === 'done' && '上传完成'}
                  {attachment.status === 'error' && `失败：${attachment.error}`}
                  {attachment.status === 'idle' && '等待上传'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
