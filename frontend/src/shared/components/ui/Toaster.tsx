import { X } from 'lucide-react';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { useToastStore, type ToastItem } from '@/shared/stores/useToastStore';

const toneClass: Record<ToastItem['tone'], string> = {
  error: 'bg-red-soft text-red border-red/20',
  info: 'bg-surface text-ink border-line',
  success: 'bg-green-soft text-green-ink border-green/20',
};

/**
 * Mount once in the app shell. Toasts never sit over the middle of the screen,
 * which on the game board is the clock: from 640 px up they stack in a narrow
 * top-right column under the top bar, and on phones at the bottom, above
 * whatever the screen puts there (`--toast-bottom`, see `useToastSafeBottom`).
 */
export const Toaster = () => {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);
  const t = useT();

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      // Phones: `fixed`, so the shell's padding does not reach it and the
      // insets are added here — to the bottom on top of whatever furniture
      // `--toast-bottom` is already clearing, and to the sides for a landscape
      // notch. From `sm:` up the desktop corner takes over and insets are 0.
      className="pointer-events-none fixed right-[calc(var(--spacing)*4+var(--safe-right))] bottom-[calc(var(--toast-bottom)+var(--safe-bottom))] left-[calc(var(--spacing)*4+var(--safe-left))] z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:top-20 sm:right-5 sm:bottom-auto sm:w-90 sm:max-w-[calc(100vw-2.5rem)] sm:items-end"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex max-w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-pop animate-toast-in',
            toneClass[item.tone],
          )}
        >
          <span>{item.text ?? (item.code ? t.errors[item.code] : '')}</span>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="×"
            className="-mr-1 flex h-7 w-7 items-center justify-center rounded-md opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
