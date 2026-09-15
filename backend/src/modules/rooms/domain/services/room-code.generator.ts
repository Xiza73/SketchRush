import { randomInt } from 'node:crypto';

/** Uppercase letters and digits without the ambiguous O/0/I/1. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;

export function randomRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/** Draws codes until one is free; the space (32^4) dwarfs any realistic room count. */
export function generateRoomCode(isTaken: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const code = randomRoomCode();
    if (!isTaken(code)) return code;
  }
  throw new Error('Could not allocate a free room code');
}
