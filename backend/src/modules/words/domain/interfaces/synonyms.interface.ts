import type { Language } from '@shared/contract';

export const SYNONYMS = Symbol('SYNONYMS');

export interface ISynonyms {
  /**
   * Whether two words name the same thing under different flags — `acera` and
   * `vereda`, `cookie` and `biscuit`. Symmetric, and false for a word against
   * itself as far as any caller is concerned: that case is `correct`, and never
   * reaches here.
   */
  areSame(language: Language, a: string, b: string): boolean;
}
