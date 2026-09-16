import type { Language, WordChoice } from '@shared/contract';

export const WORD_PICKER = Symbol('WORD_PICKER');

export interface IWordPicker {
  /**
   * `count` options to offer the drawer, **each from a different category**, so
   * the choice is between kinds of thing rather than three arbitrary nouns.
   *
   * Skips anything the room has already played, and falls back to reusing words
   * rather than returning fewer: a short bank must not end the game.
   */
  pick(language: Language, count: number, used: readonly string[]): WordChoice[];
}
