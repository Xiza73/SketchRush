import { Card } from '@/shared/components/ui/Card';
import type { Dictionary } from '@/shared/i18n';

import type { TurnResultsViewModel } from '../models/results.model';

interface RoundHeaderProps {
  t: Dictionary;
  results: TurnResultsViewModel;
}

/** The word revealed, the "N of M got it" line, and my turn / accumulated cards. */
export const RoundHeader = ({ t, results }: RoundHeaderProps) => {
  // The drawer knew the word; counting them among those who missed it is a lie
  // that gets louder the smaller the room is.
  const missed = results.guesserCount - results.guessedCount;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex gap-1.5" aria-label={results.word}>
          {[...results.word].map((letter, index) => (
            <span
              key={index}
              className="flex h-12 w-12 items-center justify-center rounded-[9px] bg-green font-display text-2xl font-bold text-white uppercase animate-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
              aria-hidden="true"
            >
              {letter}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 font-display text-[26px] font-bold tracking-[-0.02em]">
            {results.guessedCount > 0
              ? t.results.guessedCount(results.guessedCount, results.guesserCount)
              : t.results.nobodySolved}
          </h2>
          <p className="m-0 text-sm text-ink-2">
            {results.first
              ? `${t.results.firstWas(results.first.name, results.first.timePercent ?? 0)} `
              : ''}
            {t.results.missedCount(missed)}
          </p>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Card className="flex min-w-30 flex-col gap-0.5 px-4 py-3">
          <span className="label">{t.results.yourRound}</span>
          <span className="font-display text-[28px] leading-none font-extrabold tracking-[-0.02em]">
            {results.myRow?.turnPoints ?? 0}
          </span>
        </Card>
        <Card inverted className="flex min-w-30 flex-col gap-0.5 px-4 py-3">
          <span className="label text-on-ink opacity-60">{t.results.yourTotal}</span>
          <span className="font-display text-[28px] leading-none font-extrabold tracking-[-0.02em]">
            {results.myStanding?.total ?? 0}
          </span>
        </Card>
      </div>
    </div>
  );
};
