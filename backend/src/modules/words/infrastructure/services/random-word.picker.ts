import { Inject, Injectable } from '@nestjs/common';
import type { Language } from '@shared/contract';
import { IWordList, WORD_LIST } from '../../domain/interfaces/word-list.interface';
import { IWordPicker } from '../../domain/interfaces/word-picker.interface';

@Injectable()
export class RandomWordPicker implements IWordPicker {
  constructor(@Inject(WORD_LIST) private readonly words: IWordList) {}

  pick(language: Language, count: number, used: readonly string[]): string[] {
    const bank = this.words.all(language);
    const seen = new Set(used);
    const fresh = bank.filter((word) => !seen.has(word));
    // A room that outlasts the bank keeps playing with repeats rather than
    // being handed fewer choices than the contract promises.
    const pool = fresh.length >= count ? [...fresh] : [...bank];

    const chosen: string[] = [];
    while (chosen.length < count && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(index, 1)[0]);
    }
    return chosen;
  }
}
