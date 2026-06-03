import { useState } from 'react';
import type { ClipboardEventHandler, DragEventHandler, ReactNode } from 'react';
import type { FileInfoListItem } from '@c_chat/shared-types';
import { Paperclip, Send, Smile, X } from 'lucide-react';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { Dialog, DialogContent, DialogTitle } from '../../components/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover';
import { Textarea } from '../../components/textarea';
import { cn } from '../../lib/utils';

const DEFAULT_EMOJIS = [
  '\u{1F604}',
  '\u{1F602}',
  '\u{1F60D}',
  '\u{1F44D}',
  '\u{1F389}',
  '\u{1F917}',
  '\u{1F525}',
  '\u{1F64F}',
  '\u{1F60E}',
  '\u{1F3B5}',
];

export interface ChatComposerLabels {
  attach?: string;
  emptyWarning?: string;
  placeholder?: string;
  previewTitle?: string;
  send?: string;
  sending?: string;
}

export interface ChatComposerProps {
  value: string;
  attachments: FileInfoListItem[];
  sending: boolean;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onSelectFiles: () => void;
  onRemoveAttachment: (id: string) => void;
  onPaste?: ClipboardEventHandler<HTMLTextAreaElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  actionsSlot?: ReactNode;
  className?: string;
  disabled?: boolean;
  labels?: ChatComposerLabels;
}

function ChatAttachmentItem({
  item,
  onRemove,
  previewTitle,
}: {
  item: FileInfoListItem;
  onRemove: (id: string) => void;
  previewTitle: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewUrl = item.url;

  return (
    <Card className="group relative size-28 overflow-hidden p-0">
      <Button
        type="button"
        size="icon-xs"
        variant="secondary"
        className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100"
        onClick={() => onRemove(item.id)}
      >
        <X />
      </Button>

      {previewUrl ? (
        <button
          type="button"
          className="size-full overflow-hidden"
          onClick={() => setPreviewOpen(true)}
        >
          <img src={previewUrl} alt={item.fileName} className="size-full object-cover" />
        </button>
      ) : (
        <div className="flex size-full flex-col justify-center gap-2 p-3">
          <div className="truncate text-sm font-medium">{item.fileName}</div>
          <div className="text-xs text-muted-foreground">{item.mimeType}</div>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90dvh] max-w-[90vw] border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{previewTitle}</DialogTitle>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={item.fileName}
              className="max-h-[90dvh] max-w-[90vw] rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ChatAttachmentList({
  attachments,
  onRemoveAttachment,
  previewTitle,
}: {
  attachments: FileInfoListItem[];
  onRemoveAttachment: (id: string) => void;
  previewTitle: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 p-2">
      {attachments.map((item) => (
        <ChatAttachmentItem
          key={item.id}
          item={item}
          onRemove={onRemoveAttachment}
          previewTitle={previewTitle}
        />
      ))}
    </div>
  );
}

function EmojiPicker({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={disabled}>
          <Smile />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-44 p-2">
        <div className="grid grid-cols-5 gap-2">
          {DEFAULT_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ChatComposer({
  value,
  attachments,
  sending,
  onValueChange,
  onSubmit,
  onSelectFiles,
  onRemoveAttachment,
  onPaste,
  onDrop,
  onDragOver,
  actionsSlot,
  className,
  disabled = false,
  labels,
}: ChatComposerProps) {
  const previewTitle = labels?.previewTitle ?? 'Attachment preview';
  const sendDisabled = disabled || sending || (!value.trim() && attachments.length === 0);

  return (
    <div
      className={cn(
        'mx-auto w-full overflow-hidden rounded-xl border bg-background shadow-lg',
        className,
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {attachments.length > 0 && (
        <ChatAttachmentList
          attachments={attachments}
          onRemoveAttachment={onRemoveAttachment}
          previewTitle={previewTitle}
        />
      )}

      <div className="p-4">
        <Textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          onPaste={onPaste}
          disabled={disabled}
          placeholder={labels?.placeholder ?? 'Type a message, or paste/drop images...'}
          className="max-h-[100px] resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={labels?.attach ?? 'Attach file'}
              disabled={disabled}
              onClick={onSelectFiles}
            >
              <Paperclip />
            </Button>

            {actionsSlot}

            <EmojiPicker
              disabled={disabled}
              onSelect={(emoji) => onValueChange(`${value}${emoji}`)}
            />
          </div>

          <Button type="button" onClick={onSubmit} disabled={sendDisabled} size="sm">
            <Send data-icon="inline-start" />
            {sending ? (labels?.sending ?? 'Sending...') : (labels?.send ?? 'Send')}
          </Button>
        </div>
      </div>
    </div>
  );
}
