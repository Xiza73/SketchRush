import type { Language, WordCategory } from '@shared/contract';

export const WORD_LIST = Symbol('WORD_LIST');

export interface IWordList {
  /** One category of a language, in the bank's natural spelling. */
  byCategory(language: Language, category: WordCategory): readonly string[];
}
