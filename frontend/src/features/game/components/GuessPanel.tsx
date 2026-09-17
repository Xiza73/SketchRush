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
  /** Screen is short — usually a keyboard. The feed gives up its room first. */
  compact?: boolean;
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
  compact = false,
  onGuess,
}: GuessPanelProps) => {
  const t = useT();
  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<'close' | 'wrong' | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [feed]);

  // The drawer picking a word is the starting gun, and it fires on somebody
  // else's screen. Without this the turn opens with the clock already running
  // and the caret nowhere, and the first thing every guesser does is click.
  useEffect(() => {
    if (canGuess) inputRef.current?.focus();
  }, [canGuess]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const guess = text.trim();
    if (!guess) return;
    setText('');
    setVerdict(null);
    // The box never goes disabled mid-guess, so the caret stays where it is and
    // the next word can be typed while this one is still in the air. This one
    // call covers the case where something else stole focus anyway.
    inputRef.current?.focus();
    const result = await onGuess(guess);
    if (result.correct) return;
    setVerdict(result.close ? 'close' : 'wrong');
    inputRef.current?.focus();
  };

  const label = (entry: FeedEntry): string => {
    switch (entry.kind) {
      case 'guessed':
        return t.game.feedGuessed(nameOf(entry.playerId ?? ''), Number(entry.text));
      case 'word':
        return t.game.feedWordWas(entry.text);
      case 'attempt':
        return entry.verdict === 'close'
          ? t.game.feedAttemptClose(nameOf(entry.playerId ?? ''))
          : t.game.feedAttemptWrong(nameOf(entry.playerId ?? ''));
      default:
        return entry.text;
    }
  };

  return (
    <div
      className={cn(
        // Typing here is the only way a guesser scores, so while the box is live
        // the whole panel says so. The accent carries action in this family; it
        // never touches a right/wrong state, and none of those live up here.
        // `overflow-hidden` is load-bearing: the header below carries its own
        // background, and without clipping its square corners sit outside this
        // rounded border — visible as a notch wherever the two meet.
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-surface transition-colors',
        // Grows to fill the column normally; with a keyboard up it must take
        // only what the box needs, so the drawing keeps the rest.
        compact ? 'flex-none' : 'flex-1',
        canGuess ? 'border-accent shadow-card' : 'border-line',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b px-3.5 py-2.5 transition-colors',
          canGuess ? 'border-accent-soft bg-accent-soft' : 'border-line',
          // The label explains the box; with a keyboard up the box is the only
          // thing left on screen and explains itself.
          compact && 'hidden',
        )}
      >
        <span className={cn('label', canGuess && 'text-accent')}>
          {canGuess ? t.game.feedLive : t.game.roomFeed}
        </span>
        <span className="text-xs text-ink-3">
          {mode === 'chat' ? t.game.modeChat : t.game.modeBox}
        </span>
      </div>

      <ul
        ref={listRef}
        aria-live="polite"
        className={cn(
          'm-0 flex flex-1 list-none flex-col gap-1 overflow-y-auto p-3',
          'max-h-70 min-h-30',
          // The feed is history. On a screen with 500 px left it is the first
          // thing to go, because the drawing in front of you is not history.
          compact && 'hidden',
        )}
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
              // The drawer's private view of a miss. Dashed because it marks a
              // gap rather than a value: somebody tried, and that is all it
              // will ever say about what they typed.
              entry.kind === 'attempt' &&
                'border border-dashed ' +
                  (entry.verdict === 'close'
                    ? 'border-yellow-line bg-yellow-soft font-medium text-yellow-ink'
                    : 'border-line text-ink-3'),
              // My own attempts, colour-coded by how they landed. Only I have
              // these: in a `box` room nobody else ever sees what I typed.
              entry.kind === 'mine' &&
                'self-end border text-right font-medium ' +
                  (entry.verdict === 'correct'
                    ? 'border-green bg-green-soft text-green-ink'
                    : entry.verdict === 'close'
                      ? 'border-yellow-line bg-yellow-soft text-yellow-ink'
                      : 'border-line bg-surface-2 text-ink-3 line-through'),
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
              ref={inputRef}
              value={text}
              // Deliberately not disabled while a guess is in flight: disabling a
              // focused input blurs it, and losing the caret after every Enter is
              // the difference between a fast game and a clumsy one.
              disabled={!canGuess}
              autoFocus
              maxLength={ROOM_LIMITS.guessMaxLength}
              autoComplete="off"
              aria-label={mode === 'chat' ? t.game.guessOrChat : t.game.yourGuess}
              placeholder={mode === 'chat' ? t.game.guessOrChat : t.game.yourGuess}
              invalid={verdict === 'wrong'}
              onChange={(event) => {
                setText(event.target.value);
                if (verdict) setVerdict(null);
              }}
              className="h-12 text-base"
            />
            <button
              type="submit"
              disabled={!canGuess || pending || text.trim().length === 0}
              aria-label={t.game.sendGuess}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-accent text-white transition-colors hover:bg-accent-hover active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-40"
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
