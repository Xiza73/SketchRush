import { editDistance, normalizeWord } from '@modules/words/domain/services/normalize-word';

export type GuessVerdict = 'correct' | 'close' | 'wrong';

/**
 * How near a near miss has to be before it is worth telling somebody about.
 *
 * One edit apart is the obvious rule and it is wrong on short words: `gato` and
 * `pato` are two different answers, not a typo, and saying "close" there hands
 * out the answer. Past five letters a single edit really is a slip.
 *
 * docs/context/04 lists this as open; five is the starting point, not a result.
 */
const MIN_LENGTH_FOR_CLOSE = 5;

export const judgeGuess = (guess: string, answer: string): GuessVerdict => {
  const said = normalizeWord(guess);
  const target = normalizeWord(answer);
  if (said.length === 0) return 'wrong';
  if (said === target) return 'correct';
  if (target.length >= MIN_LENGTH_FOR_CLOSE && editDistance(said, target) === 1) return 'close';
  return 'wrong';
};

/**
 * Whether a message gives the answer away. A chat room broadcasts what people
 * type, so the drawer typing the word — or anybody spelling it out after they
 * have already guessed — must not reach the room.
 */
export const revealsAnswer = (text: string, answer: string): boolean => {
  const target = normalizeWord(answer);
  if (target.length === 0) return false;
  return normalizeWord(text).split(' ').includes(target);
};
