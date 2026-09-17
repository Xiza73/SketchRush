import type { ReactNode } from 'react';

import { Avatar } from '@/shared/components/ui/Avatar';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import { LangSegmented } from './LangSegmented';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  /** Room code, round, word language... rendered after the logo divider. */
  context?: ReactNode;
  /** Page-specific chips (penalty, hint) rendered before the global controls. */
  actions?: ReactNode;
  /** "Salir de la partida", rendered next to the player identity. */
  leaveAction?: ReactNode;
  playerName?: string;
  playerBadge?: string;
  connectionLabel?: string;
  /** Transparent variant for the home screen (no bottom border / surface). */
  bare?: boolean;
}

export const TopBar = ({
  context,
  actions,
  leaveAction,
  playerName,
  playerBadge,
  connectionLabel,
  bare = false,
}: TopBarProps) => {
  const t = useT();
  return (
    <header
      className={cn(
        // `pt` carries the status-bar / notch inset on top of its own padding;
        // the bar is the first thing under the top edge on every screen.
        // `app-topbar` is the hook the game screen uses to fold this away while
        // a phone keyboard is up; nothing here is worth a line of that screen.
        'app-topbar flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-[calc(var(--spacing)*2+var(--safe-top))] pb-2 sm:px-7',
        !bare && 'border-b border-line bg-surface',
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <Logo appName={t.common.appName} />
        {context ? (
          <>
            <span className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
            <div className="hidden min-w-0 items-center gap-2 text-sm text-ink-2 sm:flex">
              {context}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {connectionLabel ? (
          <span
            role="status"
            className="hidden items-center gap-2 rounded-full bg-red-soft px-3 py-1.5 text-xs font-semibold text-red sm:flex"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-red" aria-hidden="true" />
            {connectionLabel}
          </span>
        ) : null}
        {actions}
        <LangSegmented />
        <ThemeToggle />
        {leaveAction}
        {playerName ? (
          <div className="flex items-center gap-2.5 pl-1">
            <Avatar name={playerName} tone="accent" size={34} />
            <span className="hidden text-sm font-semibold sm:inline">{playerName}</span>
            {playerBadge ? (
              <span className="hidden rounded-md bg-surface-2 px-2 py-1 text-xs text-ink-3 md:inline">
                {playerBadge}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
};
