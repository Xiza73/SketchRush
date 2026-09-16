import { Card } from '@/shared/components/ui/Card';
import type { Dictionary } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import type { ScorePreview } from '../models/score-preview.model';

interface ScorePreviewCardProps {
  t: Dictionary;
  preview: ScorePreview;
  /** True once I have the word: the number stops moving and says so. */
  settled: boolean;
}

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className={cn('text-ink-2', muted && 'text-ink-3')}>{label}</span>
    <span
      className={cn('font-mono font-semibold tabular-nums whitespace-nowrap', muted && 'text-ink-3')}
    >
      {value}
    </span>
  </div>
);

/**
 * What the turn pays if it ended now, broken into the parts that decide it.
 *
 * The two rules are scored so differently that a single number teaches nobody
 * anything: a guesser is racing a clock, a drawer is being marked by the room.
 * Showing the working while it still matters is the point — by the results
 * screen it is history.
 */
export const ScorePreviewCard = ({ t, preview, settled }: ScorePreviewCardProps) => (
  <Card className="flex flex-col gap-2 px-4 pt-3.5 pb-3">
    <span className="label">
      {preview.kind === 'drawer'
        ? t.game.previewDrawing
        : settled
          ? t.game.previewLockedIn
          : t.game.previewIfYouGetIt}
    </span>

    <div className="flex flex-col gap-1.25 text-[13px]">
      {preview.kind === 'guesser' ? (
        <>
          <Row label={t.game.previewTimeLeft(preview.timePercent)} value={`+${preview.timePercent}`} />
          <Row
            label={
              preview.positionBonus > 0
                ? t.game.previewPosition(preview.position)
                : t.game.previewNoPosition
            }
            value={preview.positionBonus > 0 ? `+${preview.positionBonus}` : '0'}
            muted={preview.positionBonus === 0}
          />
        </>
      ) : (
        <>
          <Row
            label={t.game.previewGuessedSoFar(preview.guessed, preview.couldGuess)}
            value={`+${preview.average}`}
          />
          <Row
            label={t.game.previewAllGuessed}
            value={preview.allGuessedBonus > 0 ? `+${preview.allGuessedBonus}` : '0'}
            muted={preview.allGuessedBonus === 0}
          />
        </>
      )}
    </div>

    <div className="h-px bg-line" />

    <div className="flex items-baseline justify-between">
      <span className="text-[13px] font-semibold">{t.game.previewTotal}</span>
      <span className="font-display text-[28px] font-extrabold tracking-[-0.02em] tabular-nums">
        {preview.total}
      </span>
    </div>

    <p className="m-0 text-xs leading-[1.4] text-ink-3">
      {preview.kind === 'drawer' ? t.game.previewDrawerNote : t.game.previewGuesserNote}
    </p>
  </Card>
);
