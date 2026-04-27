import { useState } from 'react';
import { Smile } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '👍', '🎉', '🥲', '🔥', '🙏', '😎', '🎶'];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-input bg-background text-muted-foreground"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 w-44 rounded-2xl border bg-card p-2 shadow-lg">
          <div className="grid grid-cols-5 gap-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
                className="rounded-lg p-2 text-base hover:bg-primary/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
