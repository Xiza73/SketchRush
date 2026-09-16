import { Injectable } from '@nestjs/common';
import { WORD_CATEGORIES, type Language, type WordCategory } from '@shared/contract';
import enActions from '../../data/en/actions.json';
import enAnimals from '../../data/en/animals.json';
import enCharacters from '../../data/en/characters.json';
import enFood from '../../data/en/food.json';
import enObjects from '../../data/en/objects.json';
import enPlaces from '../../data/en/places.json';
import esActions from '../../data/es/actions.json';
import esAnimals from '../../data/es/animals.json';
import esCharacters from '../../data/es/characters.json';
import esFood from '../../data/es/food.json';
import esObjects from '../../data/es/objects.json';
import esPlaces from '../../data/es/places.json';
import { normalizeWord } from '../../domain/services/normalize-word';
import { IWordList } from '../../domain/interfaces/word-list.interface';

/**
 * One file per language per category. Two files would do at this size, but the
 * bank is meant to grow: this way adding words to one category is a diff of
 * that category, and a file's length is the category's depth at a glance.
 *
 * The imports are listed rather than globbed so a missing file is a compile
 * error instead of a category that silently disappears at runtime.
 */
const BANKS: Record<Language, Record<WordCategory, readonly string[]>> = {
  es: {
    animals: esAnimals.words,
    characters: esCharacters.words,
    food: esFood.words,
    objects: esObjects.words,
    places: esPlaces.words,
    actions: esActions.words,
  },
  en: {
    animals: enAnimals.words,
    characters: enCharacters.words,
    food: enFood.words,
    objects: enObjects.words,
    places: enPlaces.words,
    actions: enActions.words,
  },
};

/**
 * The bank is JSON loaded at boot: fixed, read-only and a few hundred kilobytes,
 * so a database would be one more service for nothing.
 *
 * It validates at construction rather than mid-turn. WordRush shipped without
 * that check, so a bad deploy would have surfaced deep inside a guess instead
 * of at startup.
 */
@Injectable()
export class JsonWordListRepository implements IWordList {
  constructor() {
    for (const [language, bank] of Object.entries(BANKS)) {
      const seen = new Map<string, string>();
      for (const category of WORD_CATEGORIES) {
        const words = bank[category];
        if (!words || words.length === 0) {
          throw new Error(`Word bank ${language}/${category} is empty`);
        }
        for (const word of words) {
          // The same word in two categories would let one turn offer it twice,
          // and would make "already played" hide it from both. English is where
          // this bites: `hammer` and `nail` are nouns and verbs both, while a
          // Spanish infinitive never collides with its noun.
          const key = normalizeWord(word);
          const other = seen.get(key);
          if (other) {
            throw new Error(`Word "${word}" is in both ${other} and ${category} (${language})`);
          }
          seen.set(key, category);
        }
      }
    }
  }

  byCategory(language: Language, category: WordCategory): readonly string[] {
    return BANKS[language][category];
  }
}
