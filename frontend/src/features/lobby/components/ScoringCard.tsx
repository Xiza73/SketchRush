import { Card } from '@/shared/components/ui/Card';
import { SCORING } from '@/shared/contract';
import type { Dictionary } from '@/shared/i18n';

interface ScoringCardProps {
  t: Dictionary;
}

const Row = ({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-ink-2">{label}</span>
    <span
      className={`font-mono font-bold whitespace-nowrap ${
        tone === 'pos' ? 'text-green-ink' : tone === 'neg' ? 'text-red' : ''
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * The lobby scoring card. Every number comes from `SCORING`, and there are only
 * two of them — see docs/context/03-scoring-system.md.
 *
 * The two halves are deliberately separate: guessing and drawing are scored on
 * different rules, and the whole design of the game is in the second one.
 */
export const ScoringCard = ({ t }: ScoringCardProps) => (
  <Card className="flex flex-col gap-5 self-start p-6">
    <h3 className="m-0 font-display text-[22px] font-bold tracking-[-0.02em]">
      {t.lobby.scoringTitle}
    </h3>

    <div className="flex flex-col gap-2.5">
      <span className="label">{t.lobby.scoringGuessing}</span>
      <Row label={t.lobby.scoringTime} value={t.lobby.scoringTimeValue} />
      <Row
        label={t.lobby.scoringPosition}
        value={SCORING.positionBonus.map((bonus) => `+${bonus}`).join(' · ')}
        tone="pos"
      />
      <Row label={t.lobby.scoringMissed} value="0" />
    </div>

    <div className="h-px bg-line" />

    <div className="flex flex-col gap-2.5">
      <span className="label">{t.lobby.scoringDrawing}</span>
      <Row label={t.lobby.scoringDrawerAverage} value={t.lobby.scoringDrawerAverageValue} />
      <Row
        label={t.lobby.scoringAllGuessed}
        value={`+${SCORING.allGuessedBonus}`}
        tone="pos"
      />
      <p className="m-0 text-xs leading-[1.45] text-ink-3">{t.lobby.scoringDrawerNote}</p>
    </div>
  </Card>
);
