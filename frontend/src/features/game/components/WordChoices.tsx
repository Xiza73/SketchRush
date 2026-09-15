import { useT } from '@/shared/i18n';

interface WordChoicesProps {
  words: string[];
  /** Seconds left before the first word is taken for them. */
  secondsLeft: number;
  pending: boolean;
  onChoose: (index: number) => void;
}

/**
 * The drawer picks one of three.
 *
 * There is no way out of it and no Escape: the clock decides if they do not,
 * so a dismissable dialog would only hide the decision it is about to make.
 */
export const WordChoices = ({ words, secondsLeft, pending, onChoose }: WordChoicesProps) => {
  const t = useT();
  const seconds = Math.max(0, Math.ceil(secondsLeft));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.game.chooseWordTitle}
        className="w-full max-w-110 rounded-2xl border border-line bg-surface p-5 shadow-xl animate-fade-in"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 font-display text-xl font-extrabold tracking-[-0.02em]">
            {t.game.chooseWordTitle}
          </h2>
          <span className="font-display text-xl font-extrabold tabular-nums text-accent">
            {seconds}
          </span>
        </div>
        <p className="mt-2 mb-4 text-sm text-ink-2">{t.game.chooseWordBody}</p>

        <div className="flex flex-col gap-2">
          {words.map((word, index) => (
            <button
              key={word}
              type="button"
              autoFocus={index === 0}
              disabled={pending}
              onClick={() => onChoose(index)}
              className="flex h-13 items-center justify-center rounded-xl border-[1.5px] border-line bg-surface-2 font-display text-lg font-bold tracking-[0.02em] transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {word}
            </button>
          ))}
        </div>

        <p className="mt-4 mb-0 text-xs text-ink-3">{t.game.chooseWordTimeout}</p>
      </div>
    </div>
  );
};
