import { ROOM_LIMITS } from '@shared/contract';

/**
 * The word as everybody but the drawer sees it: one entry per character, `null`
 * where it is still hidden. Spaces always come through, so the shape of a
 * two-word answer is visible without giving a letter away.
 */
export const maskWord = (word: string, revealed: readonly number[]): (string | null)[] => {
  const out = new Set(revealed);
  return [...word].map((char, index) => (char === ' ' || out.has(index) ? char : null));
};

/** Positions that could still be revealed: letters, and not already out. */
export const hintCandidates = (word: string, revealed: readonly number[]): number[] => {
  const out = new Set(revealed);
  return [...word]
    .map((char, index) => ({ char, index }))
    .filter(({ char, index }) => char !== ' ' && !out.has(index))
    .map(({ index }) => index);
};

/**
 * How many letters a word is worth as hints: a third of it, rounded down.
 *
 * A fixed count cannot serve both `sol` and `refrigerador` — one letter is most
 * of the first and nothing at all of the second. Tying it to the word keeps the
 * help proportional to how much there is to find. Spaces are not letters and do
 * not earn a hint; they are already visible.
 */
export const hintCount = (word: string): number =>
  Math.floor([...word].filter((char) => char !== ' ').length / ROOM_LIMITS.hintLetterShare);

/**
 * When each hint is due, in seconds from the start of the drawing.
 *
 * They are spread evenly and none of them lands at the end: one hint comes at
 * half time, two at a third and two thirds. A hint that arrives with four
 * seconds left is not a hint, it is a formality.
 */
export const hintSchedule = (count: number, drawSeconds: number): number[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) =>
    Math.round(((i + 1) / (count + 1)) * drawSeconds),
  );

/**
 * The same schedule, pulled forward by how much of the room already has it.
 *
 * Hints exist for whoever is still stuck, and the longer the board fills in
 * around them the less the original timetable is about them at all. With half
 * the room home the remaining wait halves; with everybody but one home it is
 * almost nothing, which is the point — that player is the only one it is for.
 *
 * `guessedShare` is the fraction of the players who *could* guess and have; the
 * drawer is never one of them.
 */
export const hintDueAt = (offsetSeconds: number, guessedShare: number): number =>
  offsetSeconds * (1 - Math.min(1, Math.max(0, guessedShare)));
