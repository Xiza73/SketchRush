import { Injectable } from '@nestjs/common';
import type { Language } from '@shared/contract';
import en from '../../data/en.json';
import es from '../../data/es.json';
import { IWordList } from '../../domain/interfaces/word-list.interface';

const BANKS: Record<Language, readonly string[]> = {
  es: es.words,
  en: en.words,
};

/**
 * The bank is a JSON file loaded at boot: fixed, small and read-only, so a
 * database would be one more service for nothing.
 *
 * It fails at construction rather than mid-turn if a language is empty. WordRush
 * shipped without that check, so a bad deploy would have surfaced deep inside a
 * guess instead of at startup.
 */
@Injectable()
export class JsonWordListRepository implements IWordList {
  constructor() {
    for (const [language, words] of Object.entries(BANKS)) {
      if (words.length === 0) throw new Error(`Word bank for ${language} is empty`);
    }
  }

  all(language: Language): readonly string[] {
    return BANKS[language];
  }
}
