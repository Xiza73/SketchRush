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
      className="m-0 flex flex-wrap items-end justify-center gap-0.5 font-mono text-lg leading-none font-bold tracking-[0.08em] sm:gap-1 sm:text-xl"
      // Read as the word or as a run of blanks, not as a pile of single letters.
      aria-label={word ?? masked.map((letter) => letter ?? '_').join('')}
    >
      {letters.map((letter, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'inline-flex h-6 w-4 items-end justify-center sm:w-5',
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
    // One compact block: context on the left, the word in the middle, the clock
    // on the right. The canvas is the thing that needs the height, so this gives
    // up every row it can and the whole screen fits without scrolling.
    <div className="rounded-2xl border border-line bg-surface px-3.5 pt-2 pb-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="label shrink-0">{t.common.roundOf(round, totalRounds)}</span>

        <div className="flex min-w-0 flex-1 justify-center">
          {choosing ? (
            <p className="m-0 truncate text-sm text-ink-2">
              {iAmDrawer ? t.game.chooseYourWord : t.game.drawerChoosing(drawerName)}
            </p>
          ) : (
            <MaskedWord masked={masked} word={word} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {action}
          <span
            className={cn(
              'w-8 text-right font-display text-xl font-extrabold tabular-nums',
              urgent ? 'text-red' : 'text-ink',
            )}
            // A clock that changes every second would be read out every second.
            aria-hidden={!urgent}
          >
            {choosing ? '—' : Math.ceil(secondsLeft)}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track" aria-hidden="true">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-100',
              urgent ? 'bg-red' : 'bg-accent',
            )}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span className="shrink-0 truncate text-xs text-ink-3">
          {iAmDrawer ? t.game.youAreDrawing : t.game.drawerIs(drawerName)}
        </span>
      </div>
    </div>
  );
};
