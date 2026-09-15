import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Small modal question. Hand-made (no UI kit): overlay + centred card, focus
 * on the confirm button, Escape and a click outside cancel.
 */
export const ConfirmDialog = ({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-100 rounded-2xl border border-line bg-surface p-5 shadow-xl animate-fade-in"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="m-0 font-display text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
        <p className="mt-2 mb-5 text-sm text-ink-2">{body}</p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button autoFocus variant="ink" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
