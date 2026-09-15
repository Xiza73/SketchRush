import type { CreateRoomPayload, GuessMode, Language, SessionAck } from '@/shared/contract';

export type CreateRoomRequest = CreateRoomPayload;
export type CreateRoomResponse = SessionAck;

/** Form values as the create screen holds them. */
export interface CreateRoomForm {
  name: string;
  language: Language;
  drawSeconds: number;
  rounds: number;
  capacity: number;
  guessMode: GuessMode;
  hintLetters: number;
}

export const toCreateRoomRequest = (form: CreateRoomForm): CreateRoomRequest => ({
  name: form.name.trim(),
  settings: {
    language: form.language,
    drawSeconds: form.drawSeconds,
    rounds: form.rounds,
    capacity: form.capacity,
    guessMode: form.guessMode,
    hintLetters: form.hintLetters,
  },
});
