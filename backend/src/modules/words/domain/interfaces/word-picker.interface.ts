import type { Language } from '@shared/contract';

export const WORD_PICKER = Symbol('WORD_PICKER');

export interface IWordPicker {
  /**
   * `count` distinct words to offer the drawer, skipping anything the room has
   * already played. Falls back to reusing words rather than returning fewer:
   * a short bank must not end the game.
   */
  pick(language: Language, count: number, used: readonly string[]): string[];
}
