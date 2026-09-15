import { Card } from '@/shared/components/ui/Card';
import type { Dictionary } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import type { StandingViewModel } from '../models/results.model';

interface StandingsListProps {
  t: Dictionary;
  standings: StandingViewModel[];
  title: string;
  subtitle: string;
  /** Final table shows the tie-break data under each name. */
  showDetails?: boolean;
}

/** "Acumulado" list with bars; the bar of the current player is violet. */
export const StandingsList = ({
  t,
  standings,
  title,
  subtitle,
  showDetails = false,
}: StandingsListProps) => (
  <Card className="flex min-h-0 flex-col gap-1 px-5 pt-5 pb-4">
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="m-0 font-display text-[22px] font-bold tracking-[-0.02em]">{title}</h3>
      <span className="text-xs text-ink-3">{subtitle}</span>
    </div>
    <ol className="m-0 flex list-none flex-col p-0">
      {standings.map((standing) => (
        <li key={standing.playerId} className="flex flex-col gap-1.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="w-3.5 font-mono text-xs text-ink-3">{standing.rank}</span>
              <span className="truncate font-semibold">{standing.name}</span>
              {standing.isMe ? (
                <span className="text-[11px] font-bold text-accent">{t.common.you}</span>
              ) : null}
              {showDetails ? (
                // The two tie-breaks, in the order they are applied.
                <span className="hidden text-[11px] text-ink-3 sm:inline">
                  {t.results.turnsGuessed(standing.guessed)} ·{' '}
                  {t.results.secondsThinking(standing.secondsUsed)}
                </span>
              ) : null}
            </div>
            <span className="font-mono font-bold tabular-nums">{standing.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-track">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500',
                standing.isMe ? 'bg-accent' : 'bg-ink',
              )}
              style={{ width: `${standing.barPercent}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
    <p className="m-0 mt-auto border-t border-line pt-3 text-xs leading-[1.45] text-ink-3">
      {t.results.tiebreak}
    </p>
  </Card>
);
