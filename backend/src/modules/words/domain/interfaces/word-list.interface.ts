import type { Language } from '@shared/contract';

export const WORD_LIST = Symbol('WORD_LIST');

export interface IWordList {
  /** Every word of a language, in the bank's natural spelling. */
  all(language: Language): readonly string[];
}
