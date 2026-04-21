type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function ChatInput({ value, onChange, onSend }: Props) {
  return (
    <footer className="flex items-center gap-2 border-t border-surface-200/10 bg-gradient-to-t from-surface-900/95 via-surface-900/90 to-surface-900/80 px-4 py-3">
      <input
        className="flex-1 rounded-full border border-surface-200/20 bg-surface-900/95 px-4 py-2 text-sm text-surface-50 placeholder:text-surface-400 outline-none ring-primary-400/30 transition focus:border-primary-400/70 focus:ring-1"
        placeholder="发送消息..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
      />
      <button
        className="rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_10px_18px_rgba(14,165,233,0.35)] transition hover:bg-primary-600 active:scale-95"
        onClick={onSend}
      >
        发送
      </button>
    </footer>
  );
}
