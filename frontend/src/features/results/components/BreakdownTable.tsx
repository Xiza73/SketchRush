import { Avatar } from '@/shared/components/ui/Avatar';
import { Card } from '@/shared/components/ui/Card';
import type { Dictionary } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import type { BreakdownRowViewModel } from '../models/results.model';

interface BreakdownTableProps {
  t: Dictionary;
  rows: BreakdownRowViewModel[];
}

const Num = ({ value, tone }: { value: number; tone?: 'pos' | 'mute' }) => (
  <span
    className={cn(
      'font-mono text-sm font-bold tabular-nums',
      tone === 'pos' && value > 0 && 'text-green-ink',
      tone === 'mute' && 'text-ink-3',
    )}
  >
    {value > 0 && tone === 'pos' ? `+${value}` : value}
  </span>
);

/**
 * One row per player, drawer first. Kept as a list rather than the wide grid
 * WordRush uses: a turn here has four numbers, not ten, and a list survives a
 * phone without a horizontal scroller.
 */
export const BreakdownTable = ({ t, rows }: BreakdownTableProps) => (
  <Card className="flex flex-col gap-1 p-4">
    <span className="label mb-1">{t.results.breakdown}</span>
    {rows.map((row) => (
      <div
        key={row.playerId}
        className={cn(
          'flex items-center gap-3 rounded-[10px] px-2.5 py-2',
          row.isMe && 'bg-accent-soft',
        )}
      >
        <Avatar name={row.name} tone={row.drawer ? 'accent' : 'neutral'} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{row.name}</span>
          <span className="text-xs text-ink-3">
            {row.drawer
              ? t.results.wasDrawing
              : row.guessed
                ? t.results.guessedAt(row.timePercent ?? 0, row.position ?? 0)
                : t.results.didNotGuess}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {row.positionBonus > 0 ? <Num value={row.positionBonus} tone="pos" /> : null}
          {row.allGuessedBonus > 0 ? <Num value={row.allGuessedBonus} tone="pos" /> : null}
          <span className="w-12 text-right font-mono text-[15px] font-extrabold tabular-nums">
            {row.turnPoints}
          </span>
        </div>
      </div>
    ))}
  </Card>
);
