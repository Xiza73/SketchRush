import { editDistance, normalizeWord } from '@modules/words/domain/services/normalize-word';

export type GuessVerdict = 'correct' | 'close' | 'wrong';

/**
 * How many edits away still counts as a near miss, by the length of the answer.
 *
 * One edit is the obvious rule and it is wrong on short words: `gato` and `pato`
 * are two different answers, not a typo, and calling that close hands out the
 * answer. Measured against the bank, 328 of the 459 English pairs that sit one
 * edit apart involve a word under five letters — `run`/`nun`/`bun`/`sun`,
 * `jog`/`dog`/`jug`/`fog`. Short words stay silent for a reason.
 *
 * Long words are the opposite: among the 247 Spanish and 181 English answers of
 * nine letters or more, only ten and one pair respectively sit within two edits.
 * At that length two slips are a slip, not a different word.
 */
const editBudget = (length: number): number => (length >= 9 ? 2 : length >= 5 ? 1 : 0);

/**
 * A plural typed for a singular, or the other way round.
 *
 * This is the near miss players actually hit, and the length rule above throws
 * it away on exactly the short words where it is most obvious — `gato` for
 * `gatos` is not a guess at a different animal. It is safe where a bare edit is
 * not, because it says "the right idea, wrong ending" rather than "the answer
 * is one letter from what you typed".
 *
 * The stem has to survive the strip with something left: without the floor,
 * `mes` reduces to `m` and starts matching things it has nothing to do with.
 */
const MIN_STEM = 3;

const stem = (word: string): string => {
  const shorter = word.replace(/(es|s)$/, '');
  return shorter.length >= MIN_STEM ? shorter : word;
};

export const judgeGuess = (guess: string, answer: string): GuessVerdict => {
  const said = normalizeWord(guess);
  const target = normalizeWord(answer);
  if (said.length === 0) return 'wrong';
  if (said === target) return 'correct';

  // The answer's length sets the budget, not the guess's: otherwise typing a
  // long word at a short answer would buy tolerance the answer never had.
  const budget = editBudget(target.length);
  if (budget > 0 && editDistance(said, target, budget) <= budget) return 'close';
  if (said !== target && stem(said) === stem(target)) return 'close';
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
