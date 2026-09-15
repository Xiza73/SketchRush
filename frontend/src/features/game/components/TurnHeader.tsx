import type { ReactNode } from 'react';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

interface TurnHeaderProps {
  round: number;
  totalRounds: number;
  /** Seconds left, already derived from the server's absolute deadline. */
  secondsLeft: number;
  drawSeconds: number;
  drawerName: string;
  iAmDrawer: boolean;
  /** The answer for the drawer, the mask for everybody else. */
  masked: (string | null)[];
  word: string | null;
  choosing: boolean;
  /** Sits beside the clock; the reaction picker, in practice. */
  action?: ReactNode;
}

/** The last quarter turns the clock red; a number alone is easy to miss. */
const URGENT_RATIO = 0.25;

const MaskedWord = ({ masked, word }: { masked: (string | null)[]; word: string | null }) => {
  const letters = word ? [...word.toUpperCase()] : masked;
  return (
    <p
      className="m-0 flex flex-wrap justify-center gap-1 font-mono text-2xl font-bold tracking-[0.1em]"
      // Read as the word or as a run of blanks, not as a pile of single letters.
      aria-label={word ?? masked.map((letter) => letter ?? '_').join('')}
    >
      {letters.map((letter, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'inline-flex h-9 w-6 items-end justify-center',
            letter === ' ' ? '' : 'border-b-2 border-ink-3',
            letter !== null && letter !== ' ' && !word && 'text-accent',
          )}
        >
          {letter === ' ' ? '' : (letter ?? '')}
        </span>
      ))}
    </p>
  );
};

export const TurnHeader = ({
  round,
  totalRounds,
  secondsLeft,
  drawSeconds,
  drawerName,
  iAmDrawer,
  masked,
  word,
  choosing,
  action,
}: TurnHeaderProps) => {
  const t = useT();
  const ratio = drawSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / drawSeconds)) : 0;
  const urgent = !choosing && ratio <= URGENT_RATIO;

  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="label">{t.common.roundOf(round, totalRounds)}</span>
        <div className="flex items-center gap-2.5">
          {action}
          <span
            className={cn(
              'font-display text-2xl font-extrabold tabular-nums',
              urgent ? 'text-red' : 'text-ink',
            )}
            // A clock that changes every second would be read out every second.
            aria-hidden={!urgent}
          >
            {choosing ? '—' : Math.ceil(secondsLeft)}
          </span>
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-track" aria-hidden="true">
        <div
          className={cn('h-full rounded-full transition-[width] duration-100', urgent ? 'bg-red' : 'bg-accent')}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <div className="mt-3 text-center">
        {choosing ? (
          <p className="m-0 text-sm text-ink-2">
            {iAmDrawer ? t.game.chooseYourWord : t.game.drawerChoosing(drawerName)}
          </p>
        ) : (
          <>
            <MaskedWord masked={masked} word={word} />
            <p className="mt-1.5 mb-0 text-xs text-ink-3">
              {iAmDrawer ? t.game.youAreDrawing : t.game.drawerIs(drawerName)}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
