import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ROOM_LIMITS, type GuessMode } from '@/shared/contract';
import { ArrowRightIcon, CheckIcon } from '@/shared/components/icons/GameIcons';
import { Input } from '@/shared/components/ui/Input';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import type { FeedEntry } from '../models/turn.model';

interface GuessPanelProps {
  mode: GuessMode;
  feed: FeedEntry[];
  /** Resolves player ids for the feed; unknown ids fall back to their id. */
  nameOf: (playerId: string) => string;
  /** False for the drawer and for anybody who already has it. */
  canGuess: boolean;
  iGuessed: boolean;
  iAmDrawer: boolean;
  pending: boolean;
  onGuess: (text: string) => Promise<{ correct: boolean; close: boolean }>;
}

/**
 * The room feed and, for whoever can still guess, the box.
 *
 * In a `box` room the feed only carries what the room is allowed to know —
 * who got it and where they placed. In a `chat` room it also carries what
 * people typed, minus anything that gave the word away (the server drops those
 * before they ever reach here).
 */
export const GuessPanel = ({
  mode,
  feed,
  nameOf,
  canGuess,
  iGuessed,
  iAmDrawer,
  pending,
  onGuess,
}: GuessPanelProps) => {
  const t = useT();
  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<'close' | 'wrong' | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [feed]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const guess = text.trim();
    if (!guess || pending) return;
    setText('');
    setVerdict(null);
    const result = await onGuess(guess);
    if (result.correct) return;
    setVerdict(result.close ? 'close' : 'wrong');
  };

  const label = (entry: FeedEntry): string => {
    switch (entry.kind) {
      case 'guessed':
        return t.game.feedGuessed(nameOf(entry.playerId ?? ''), Number(entry.text));
      case 'word':
        return t.game.feedWordWas(entry.text);
      default:
        return entry.text;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <span className="label">{t.game.roomFeed}</span>
        <span className="text-xs text-ink-3">
          {mode === 'chat' ? t.game.modeChat : t.game.modeBox}
        </span>
      </div>

      <ul
        ref={listRef}
        aria-live="polite"
        className="m-0 flex max-h-70 min-h-30 flex-1 list-none flex-col gap-1 overflow-y-auto p-3"
      >
        {feed.length === 0 && (
          <li className="m-auto px-2 text-center text-sm text-ink-3">
            {iAmDrawer ? t.game.feedEmptyDrawer : t.game.feedEmpty}
          </li>
        )}
        {feed.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              'rounded-lg px-2 py-1 text-sm',
              entry.kind === 'guessed' && 'bg-green-soft font-semibold text-green-ink',
              entry.kind === 'word' && 'bg-surface-2 font-semibold',
              entry.kind === 'chat' && 'text-ink-2',
            )}
          >
            {entry.kind === 'chat' && (
              <span className="font-semibold text-ink">{nameOf(entry.playerId ?? '')}: </span>
            )}
            {label(entry)}
          </li>
        ))}
      </ul>

      <div className="border-t border-line p-2.5">
        {iAmDrawer ? (
          <p className="m-0 py-1.5 text-center text-sm text-ink-3">{t.game.drawerCannotGuess}</p>
        ) : iGuessed ? (
          <p className="m-0 flex items-center justify-center gap-1.5 py-1.5 text-center text-sm font-semibold text-green-ink">
            <CheckIcon size={16} />
            {t.game.youGotIt}
          </p>
        ) : (
          <form onSubmit={submit} className="flex gap-2">
            <Input
              value={text}
              disabled={!canGuess || pending}
              maxLength={ROOM_LIMITS.guessMaxLength}
              autoComplete="off"
              aria-label={mode === 'chat' ? t.game.guessOrChat : t.game.yourGuess}
              placeholder={mode === 'chat' ? t.game.guessOrChat : t.game.yourGuess}
              invalid={verdict === 'wrong'}
              onChange={(event) => {
                setText(event.target.value);
                if (verdict) setVerdict(null);
              }}
              className="h-11"
            />
            <button
              type="submit"
              disabled={!canGuess || pending || text.trim().length === 0}
              aria-label={t.game.sendGuess}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              <ArrowRightIcon size={18} />
            </button>
          </form>
        )}
        {verdict !== null && (
          <p
            role="status"
            className={cn(
              'mt-1.5 mb-0 text-center text-xs font-semibold',
              verdict === 'close' ? 'text-yellow-ink' : 'text-ink-3',
            )}
          >
            {verdict === 'close' ? t.game.soClose : t.game.notIt}
          </p>
        )}
      </div>
    </div>
  );
};
