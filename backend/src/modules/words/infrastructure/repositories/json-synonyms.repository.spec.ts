import { WORD_CATEGORIES, type Language, type WordCategory } from '@shared/contract';
import enSynonyms from '../../data/en/synonyms.json';
import esSynonyms from '../../data/es/synonyms.json';
import { normalizeWord } from '../../domain/services/normalize-word';
import type { IWordList } from '../../domain/interfaces/word-list.interface';
import { JsonSynonymsRepository } from './json-synonyms.repository';
import { JsonWordListRepository } from './json-word-list.repository';

const bank = new JsonWordListRepository();

/**
 * Constructing it against the real bank is the test. Every rule the repository
 * enforces is enforced on the shipped files, so a bad row fails here rather
 * than at a deploy — or worse, silently, as a group that can never fire.
 */
describe('the shipped synonym files', () => {
  it('boots against the real word bank', () => {
    expect(() => new JsonSynonymsRepository(bank)).not.toThrow();
  });

  it('answers both ways round', () => {
    const synonyms = new JsonSynonymsRepository(bank);

    expect(synonyms.areSame('es', 'vereda', 'acera')).toBe(true);
    expect(synonyms.areSame('es', 'acera', 'vereda')).toBe(true);
    expect(synonyms.areSame('en', 'biscuit', 'cookie')).toBe(true);
    expect(synonyms.areSame('en', 'cookie', 'biscuit')).toBe(true);
  });

  it('ignores accents and case, like every other comparison here', () => {
    const synonyms = new JsonSynonymsRepository(bank);

    expect(synonyms.areSame('es', 'ANDEN', 'acera')).toBe(true);
    expect(synonyms.areSame('es', 'plátano', 'Guineo')).toBe(true);
  });

  it('keeps the languages apart', () => {
    const synonyms = new JsonSynonymsRepository(bank);

    expect(synonyms.areSame('en', 'vereda', 'acera')).toBe(false);
    expect(synonyms.areSame('es', 'cookie', 'biscuit')).toBe(false);
  });

  it('says no to two words that merely both exist', () => {
    const synonyms = new JsonSynonymsRepository(bank);

    expect(synonyms.areSame('es', 'acera', 'piscina')).toBe(false);
    expect(synonyms.areSame('es', 'gato', 'perro')).toBe(false);
  });
});

/**
 * A group with two bank words is allowed and wanted — `pastel` and `tarta` are
 * both answers, and a player who types one at the other has named the thing.
 * This only prints the count, so the number moving is visible in a diff rather
 * than being a surprise.
 */
describe('coverage', () => {
  const inBank = (language: Language) =>
    new Set(
      WORD_CATEGORIES.flatMap((category: WordCategory) =>
        bank.byCategory(language, category).map(normalizeWord),
      ),
    );

  const files: Record<Language, readonly (readonly string[])[]> = {
    es: esSynonyms.groups,
    en: enSynonyms.groups,
  };

  it.each<Language>(['es', 'en'])('every %s group can fire at least once', (language) => {
    const words = inBank(language);
    const dead = files[language].filter(
      (group) => !group.some((word) => words.has(normalizeWord(word))),
    );

    expect(dead).toEqual([]);
  });
});

/** The repository's own rules, on data written to break them. */
describe('boot validation', () => {
  const stub = (words: Record<WordCategory, string[]>): IWordList => ({
    byCategory: (_language, category) => words[category],
  });

  it('refuses a language whose bank it cannot see', () => {
    const empty = stub({
      animals: [],
      characters: [],
      food: [],
      objects: [],
      places: [],
      actions: [],
    });

    expect(() => new JsonSynonymsRepository(empty)).toThrow(/is in the es bank/);
  });
});
