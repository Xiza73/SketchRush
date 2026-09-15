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
 * When each hint is due, as a fraction of the turn.
 *
 * They are spread evenly and none of them lands at the end: one hint comes at
 * half time, two at a third and two thirds. A hint that arrives with four
 * seconds left is not a hint, it is a formality.
 */
export const hintSchedule = (hintLetters: number, drawSeconds: number): number[] =>
  Array.from({ length: Math.max(0, hintLetters) }, (_, i) =>
    Math.round(((i + 1) / (hintLetters + 1)) * drawSeconds),
  );
