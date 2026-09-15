import { ROOM_LIMITS, type RoomSettings } from '@/shared/contract';

type Timed = Pick<RoomSettings, 'rounds' | 'capacity' | 'drawSeconds'>;

/**
 * Upper bound of a whole session, in minutes.
 *
 * The lobby shows this because nobody works `rounds × players × drawTime` out
 * of four separate dropdowns, and at the top of every range this game runs over
 * an hour. It counts the full turn — choosing the word and the reveal, not just
 * the drawing — and assumes a full room, so it is the longest the game can be
 * rather than the shortest.
 */
export const sessionMinutes = (settings: Timed): number => {
  const perTurn = settings.drawSeconds + ROOM_LIMITS.chooseSeconds + ROOM_LIMITS.betweenTurnsSeconds;
  return Math.round((settings.rounds * settings.capacity * perTurn) / 60);
};
