import { useEffect, useRef, useState } from 'react';

import { EMOTES } from '@/shared/contract';
import { EmoteIcon } from '@/shared/components/icons/EmoteIcon';
import { useNow } from '@/shared/hooks/useNow';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import { useSendReaction } from '../api/send-reaction/useSendReaction';
import { useReactionsStore } from '../stores/useReactionsStore';

/**
 * The twenty stickers, all of them, in the 5x4 grid the contract's `EMOTES`
 * order is written for. No recents row and no tabs: everything is on screen at
 * once, so there is nothing to shortcut.
 */
export const ReactionPicker = ({ className }: { className?: string }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { sendReaction } = useSendReaction();
  const pausedUntil = useReactionsStore((state) => state.pausedUntil);

  // Only ticks while a pause is actually running.
  const now = useNow(250, pausedUntil > 0);
  const paused = pausedUntil > now;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Escape must land the caret back on the button it came from, or the tab
      // order restarts at the top of the page.
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? t.game.reactionsClose : t.game.reactionsOpen}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors',
          open ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2',
        )}
      >
        <EmoteIcon emote="love" size={20} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t.game.reactions}
          className="absolute top-full right-0 z-30 mt-2 w-max rounded-2xl border border-line bg-surface p-2 shadow-pop animate-emote-pop"
        >
          <div className="grid grid-cols-5 gap-1">
            {EMOTES.map((emote, index) => (
              <button
                key={emote}
                type="button"
                autoFocus={index === 0}
                disabled={paused}
                aria-label={t.emotes[emote]}
                onClick={() => {
                  void sendReaction(emote);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] transition-transform hover:scale-110 hover:bg-surface-2 disabled:scale-100 disabled:opacity-40"
              >
                <EmoteIcon emote={emote} size={30} />
              </button>
            ))}
          </div>
          {paused && (
            <p role="status" className="m-0 px-1 pt-2 pb-0.5 text-center text-xs text-ink-3">
              {t.game.reactionCooldown}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
