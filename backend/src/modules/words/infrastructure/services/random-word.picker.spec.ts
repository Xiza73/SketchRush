import { WORD_CATEGORIES, type Language, type WordCategory } from '@shared/contract';
import type { IWordList } from '../../domain/interfaces/word-list.interface';
import { JsonWordListRepository } from '../repositories/json-word-list.repository';
import { RandomWordPicker } from './random-word.picker';

/** A bank with `size` words per category, named so the category is readable. */
const fakeBank = (size: number): IWordList => ({
  byCategory: (_language: Language, category: WordCategory) =>
    Array.from({ length: size }, (_, i) => `${category}-${i}`),
});

const categoryOf = (word: string) => word.split('-')[0];

describe('RandomWordPicker', () => {
  it('offers one word from three different categories', () => {
    const picker = new RandomWordPicker(fakeBank(10));
    // Random: one pass proves nothing, so this asserts over many.
    for (let run = 0; run < 200; run++) {
      const chosen = picker.pick('es', 3, []);
      expect(chosen).toHaveLength(3);
      expect(new Set(chosen.map((c) => c.category)).size).toBe(3);
      // The category it reports has to be the one the word came from.
      for (const choice of chosen) expect(categoryOf(choice.word)).toBe(choice.category);
    }
  });

  it('never repeats a word inside one set of choices', () => {
    const picker = new RandomWordPicker(fakeBank(1));
    for (let run = 0; run < 50; run++) {
      const words = picker.pick('es', 3, []).map((c) => c.word);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('skips what the room has already played', () => {
    const picker = new RandomWordPicker(fakeBank(2));
    const used = WORD_CATEGORIES.map((category) => `${category}-0`);
    for (let run = 0; run < 100; run++) {
      for (const choice of picker.pick('es', 3, used)) {
        expect(used).not.toContain(choice.word);
      }
    }
  });

  /**
   * A room that outlives the bank keeps playing with repeats rather than being
   * handed fewer options than the contract promises.
   */
  it('still fills the offer when every word has been played', () => {
    const picker = new RandomWordPicker(fakeBank(1));
    const everything = WORD_CATEGORIES.map((category) => `${category}-0`);
    const chosen = picker.pick('es', 3, everything);
    expect(chosen).toHaveLength(3);
    expect(new Set(chosen.map((c) => c.word)).size).toBe(3);
  });

  it('can be asked for more options than there are categories', () => {
    const picker = new RandomWordPicker(fakeBank(10));
    const chosen = picker.pick('es', WORD_CATEGORIES.length + 2, []);
    expect(chosen).toHaveLength(WORD_CATEGORIES.length + 2);
    expect(new Set(chosen.map((c) => c.word)).size).toBe(chosen.length);
  });
});

/**
 * The bank is hand-written data, and every rule below was broken by hand at
 * least once while writing it: a word in two categories, a two-word entry, the
 * same word twice in one file. Reading for them does not work; this does.
 */
describe('the shipped word banks', () => {
  const bank = new JsonWordListRepository();
  const LANGUAGES = ['es', 'en'] as const;

  // The repository itself throws at construction on an empty category or a
  // word that lives in two of them.
  it('loads', () => {
    expect(() => new JsonWordListRepository()).not.toThrow();
  });

  it.each(LANGUAGES)('gives %s every category with real depth', (language) => {
    for (const category of WORD_CATEGORIES) {
      expect(bank.byCategory(language, category).length).toBeGreaterThanOrEqual(150);
    }
  });

  it.each(LANGUAGES)('holds only single lowercase words in %s', (language) => {
    const offenders: string[] = [];
    for (const category of WORD_CATEGORIES) {
      for (const word of bank.byCategory(language, category)) {
        // One word, because a two-word answer is far harder to type against a
        // clock; trimmed and lowercase, because the reveal prints it verbatim.
        const bad =
          /\s/.test(word) || word !== word.trim() || word !== word.toLowerCase() || word.length < 3;
        if (bad) offenders.push(`${category}/${word}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it.each(LANGUAGES)('never repeats a word inside a %s category', (language) => {
    for (const category of WORD_CATEGORIES) {
      const words = bank.byCategory(language, category);
      expect(new Set(words).size).toBe(words.length);
    }
  });
});
