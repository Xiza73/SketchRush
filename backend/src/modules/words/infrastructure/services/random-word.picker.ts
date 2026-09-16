import { Inject, Injectable } from '@nestjs/common';
import {
  WORD_CATEGORIES,
  type Language,
  type WordCategory,
  type WordChoice,
} from '@shared/contract';
import { IWordList, WORD_LIST } from '../../domain/interfaces/word-list.interface';
import { IWordPicker } from '../../domain/interfaces/word-picker.interface';

/** Fisher-Yates on a copy; the caller's array is never touched. */
const shuffled = <T>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

@Injectable()
export class RandomWordPicker implements IWordPicker {
  constructor(@Inject(WORD_LIST) private readonly words: IWordList) {}

  pick(language: Language, count: number, used: readonly string[]): WordChoice[] {
    // Two different exclusions, and they must not be confused: one is the whole
    // game's history, the other is only what is already in this set of three.
    const playedEarlier = new Set(used);
    const taken = new Set<string>();
    const chosen: WordChoice[] = [];

    const draw = (category: WordCategory, skipPlayed: boolean): string | null => {
      const bank = this.words.byCategory(language, category);
      const pool = bank.filter(
        (word) => !taken.has(word) && (!skipPlayed || !playedEarlier.has(word)),
      );
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)] ?? null;
    };

    // Walking a shuffled category list, rather than drawing categories at
    // random, is what guarantees `count` *different* ones without ever looping
    // on bad luck.
    for (const category of shuffled(WORD_CATEGORIES)) {
      if (chosen.length === count) break;
      const word = draw(category, true);
      if (word) {
        chosen.push({ word, category });
        taken.add(word);
      }
    }

    // Asked for more options than there are categories, or the game has run
    // through the bank: top up from anywhere, repeating a category if that is
    // what it takes. A short bank must not end the game.
    for (const category of shuffled(WORD_CATEGORIES)) {
      while (chosen.length < count) {
        const word = draw(category, false);
        if (!word) break;
        chosen.push({ word, category });
        taken.add(word);
      }
    }

    return chosen;
  }
}
