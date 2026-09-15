/**
 * The shape a word is compared in. Never what a player sees: the reveal shows
 * the bank's natural spelling, this is only ever used to decide whether two
 * strings are the same guess.
 *
 * Decomposing to NFD and dropping every combining mark handles accents and `ñ`
 * in one pass — `ñ` decomposes to `n` plus a combining tilde — which is exactly
 * the looseness docs/context/02-game-rules.md asks for. Anything that is not a
 * letter goes too, so `¡pingüino!` and `pinguino` are one guess.
 */
export const normalizeWord = (raw: string): string =>
  raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

/**
 * How far apart two words are, capped: this only ever has to answer "is it one
 * edit away", so it stops counting past `max` instead of filling a full matrix.
 */
export const editDistance = (a: string, b: string, max = 1): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      current.push(value);
      if (value < best) best = value;
    }
    // Every remaining row can only add to the best score on this one.
    if (best > max) return max + 1;
    previous = current;
  }
  return previous[b.length] ?? max + 1;
};
