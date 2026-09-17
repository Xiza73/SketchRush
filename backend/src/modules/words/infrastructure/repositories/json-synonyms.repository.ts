import { Inject, Injectable } from '@nestjs/common';
import { WORD_CATEGORIES, type Language } from '@shared/contract';
import enSynonyms from '../../data/en/synonyms.json';
import esSynonyms from '../../data/es/synonyms.json';
import { normalizeWord } from '../../domain/services/normalize-word';
import { ISynonyms } from '../../domain/interfaces/synonyms.interface';
import { IWordList, WORD_LIST } from '../../domain/interfaces/word-list.interface';

/**
 * Groups of words that are the same thing called differently: `acera`,
 * `vereda`, `banqueta`, `andén`.
 *
 * Groups rather than canonical → variants, because the relation is symmetric
 * and the bank can hold more than one side of it — `pastel` and `tarta` are
 * both answers this game gives out, and `cookie` and `biscuit` both are in the
 * English one. A canonical map would have to write that fact twice, in two
 * rows that can drift apart. A group writes it once and reads both ways.
 */
const GROUPS: Record<Language, readonly (readonly string[])[]> = {
  es: esSynonyms.groups,
  en: enSynonyms.groups,
};

/**
 * Regional variants, loaded and checked at boot like the bank beside it.
 *
 * The check that earns its keep is the last one: a group only ever fires when
 * the **answer** is one of its words, so a group the bank never answers with
 * can do nothing at all. It is not a hypothetical — the first draft of the
 * English file had eleven such rows (`petrol`/`gasoline`, `nappy`/`diaper`,
 * `queue`/`line`), every one a real pair of words and not one of them a word
 * this game can ask you to draw. They read fine and would have shipped dead.
 */
@Injectable()
export class JsonSynonymsRepository implements ISynonyms {
  private readonly groupOf: Record<Language, Map<string, number>> = {
    es: new Map(),
    en: new Map(),
  };

  constructor(@Inject(WORD_LIST) words: IWordList) {
    for (const [language, groups] of Object.entries(GROUPS) as [
      Language,
      readonly (readonly string[])[],
    ][]) {
      const bank = new Set(
        WORD_CATEGORIES.flatMap((category) =>
          words.byCategory(language, category).map(normalizeWord),
        ),
      );
      const index = this.groupOf[language];

      groups.forEach((group, position) => {
        if (group.length < 2) {
          throw new Error(`Synonym group ${position} of ${language} has fewer than two words`);
        }

        for (const word of group) {
          const key = normalizeWord(word);
          // One word in two groups makes "same group" stop meaning anything:
          // the lookup would answer with whichever row was read last.
          const other = this.groupOf[language].get(key);
          if (other !== undefined) {
            throw new Error(
              `"${word}" is in synonym groups ${other} and ${position} (${language})`,
            );
          }
          index.set(key, position);
        }

        if (!group.some((word) => bank.has(normalizeWord(word)))) {
          throw new Error(
            `No word of synonym group [${group.join(', ')}] is in the ${language} bank`,
          );
        }
      });
    }
  }

  areSame(language: Language, a: string, b: string): boolean {
    const index = this.groupOf[language];
    const group = index.get(normalizeWord(a));
    return group !== undefined && group === index.get(normalizeWord(b));
  }
}
