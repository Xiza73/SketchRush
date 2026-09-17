import { Module } from '@nestjs/common';
import { SYNONYMS } from './domain/interfaces/synonyms.interface';
import { WORD_LIST } from './domain/interfaces/word-list.interface';
import { WORD_PICKER } from './domain/interfaces/word-picker.interface';
import { JsonSynonymsRepository } from './infrastructure/repositories/json-synonyms.repository';
import { JsonWordListRepository } from './infrastructure/repositories/json-word-list.repository';
import { RandomWordPicker } from './infrastructure/services/random-word.picker';

@Module({
  providers: [
    { provide: WORD_LIST, useClass: JsonWordListRepository },
    { provide: WORD_PICKER, useClass: RandomWordPicker },
    { provide: SYNONYMS, useClass: JsonSynonymsRepository },
  ],
  exports: [WORD_LIST, WORD_PICKER, SYNONYMS],
})
export class WordsModule {}
