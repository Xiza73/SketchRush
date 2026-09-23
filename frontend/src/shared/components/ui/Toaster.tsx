import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { useToastStore, type ToastItem } from '@/shared/stores/useToastStore';

const toneClass: Record<ToastItem['tone'], string> = {
  error: 'bg-red-soft text-red border-red/20',
  info: 'bg-surface text-ink border-line',
  success: 'bg-green-soft text-green-ink border-green/20',
};

/** How long a toast stays up once nobody is reading it. */
const TOAST_MS = 3200;

interface ToastRowProps {
  item: ToastItem;
  text: string;
  dismissLabel: string;
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  onDismiss: (id: number) => void;
}

const ToastRow = ({
  item,
  text,
  dismissLabel,
  paused,
  onPausedChange,
  onDismiss,
}: ToastRowProps) => {
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(item.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [paused, item.id, onDismiss]);

  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => onPausedChange(true)}
      onMouseLeave={() => onPausedChange(false)}
      onFocus={() => onPausedChange(true)}
      onBlur={() => onPausedChange(false)}
      className={cn(
        'pointer-events-auto flex max-w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-pop animate-toast-in',
        toneClass[item.tone],
      )}
    >
      <span>{text}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label={dismissLabel}
        className="-mr-1 flex h-7 w-7 items-center justify-center rounded-md opacity-70 hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
};

/**
 * Mount once in the app shell. Toasts rise from the bottom of the screen and
 * never sit over the middle of it, which on the game board is the canvas: from
 * 640 px up they stack in a narrow bottom-right column, and on phones at the
 * bottom centre, above whatever the screen puts there (`--toast-bottom`, see
 * `useToastSafeBottom`).
 *
 * The countdown lives here rather than in the store because only the view knows
 * whether somebody is reading: pointing at a toast or tabbing to its close
 * button holds the whole stack, and the clock starts over on the way out. A
 * fixed 3.2 s with no way to hold it is a notice a slower reader never gets to
 * finish, and errors are announced through this same stack.
 */
export const Toaster = () => {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);
  const [paused, setPaused] = useState(false);
  const t = useT();

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      // Phones: `fixed`, so the shell's padding does not reach it and the
      // insets are added here — to the bottom on top of whatever furniture
      // `--toast-bottom` is already clearing, and to the sides for a landscape
      // notch. From `sm:` up the desktop corner takes over: bottom right, a
      // 360 px column, plain insets of 20 px.
      className="pointer-events-none fixed right-[calc(var(--spacing)*4+var(--safe-right))] bottom-[calc(var(--toast-bottom)+var(--safe-bottom))] left-[calc(var(--spacing)*4+var(--safe-left))] z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:w-90 sm:max-w-[calc(100vw-2.5rem)] sm:items-end"
    >
      {items.map((item) => (
        <ToastRow
          key={item.id}
          item={item}
          text={item.text ?? (item.code ? t.errors[item.code] : '')}
          dismissLabel={t.common.dismiss}
          paused={paused}
          onPausedChange={setPaused}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
};
