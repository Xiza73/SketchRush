import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { Button } from '@/shared/components/ui/Button';
import { useT } from '@/shared/i18n';

/**
 * One game per browser: when the same session rejoins from another tab the
 * server moves the seat there and tells this one. Full-screen notice so nobody
 * keeps typing into a board that no longer reaches the room.
 */
export const SessionReplacedOverlay = () => {
  const t = useT();
  const replaced = useSessionStore((state) => state.replaced);
  const resumeHere = useSessionStore((state) => state.resumeHere);

  if (!replaced) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={t.common.replacedTitle}
      className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-4 bg-bg px-6 text-center"
    >
      <h2 className="m-0 max-w-140 font-display text-2xl font-extrabold tracking-[-0.02em]">
        {t.common.replacedTitle}
      </h2>
      <p className="m-0 max-w-120 text-sm text-ink-2">{t.common.replacedBody}</p>
      <Button size="lg" onClick={() => void resumeHere()}>
        {t.common.useThisTab}
      </Button>
    </div>
  );
};
