import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useT } from '@/shared/i18n';
import { PATHS } from '@/shared/routes/paths';

/**
 * "Salir de la partida" for the top bar of the game and results screens.
 * Outlined, 44 px tall, icon + label from `sm` up and icon-only on phones; the
 * confirmation says what leaving costs before the seat is given up for good.
 */
export const LeaveGameAction = () => {
  const t = useT();
  const navigate = useNavigate();
  const leaveRoom = useSessionStore((state) => state.leaveRoom);
  const [open, setOpen] = useState(false);

  // Navigate first, in the same batch as the session being forgotten: the
  // guarded route must not get a chance to bounce to `/?code=` on its way out.
  const confirm = () => {
    setOpen(false);
    navigate(PATHS.home, { replace: true });
    void leaveRoom();
  };

  return (
    <>
      <button
        type="button"
        aria-label={t.common.leaveGame}
        onClick={() => setOpen(true)}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-ink bg-transparent px-3 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface-2 active:scale-[0.98] sm:px-4"
      >
        <LogOut size={18} aria-hidden="true" />
        <span className="hidden sm:inline">{t.common.leaveGame}</span>
      </button>
      <ConfirmDialog
        open={open}
        title={t.common.leaveGameTitle}
        body={t.common.leaveGameBody}
        cancelLabel={t.common.cancel}
        confirmLabel={t.common.confirmLeave}
        onCancel={() => setOpen(false)}
        onConfirm={confirm}
      />
    </>
  );
};
