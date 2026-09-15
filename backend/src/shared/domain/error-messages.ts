import type { ErrorCode } from '@shared/contract';

/** Default human-readable message for every contract error code. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  room_not_found: 'Room not found',
  room_full: 'The room is full',
  server_full: 'The server is full right now; try again in a moment',
  game_in_progress: 'The game has already started',
  name_taken: 'That name is already taken in this room',
  invalid_payload: 'Invalid payload',
  not_host: 'Only the host can do that',
  not_enough_players: 'At least two connected players are needed',
  not_in_turn: 'There is no turn in progress',
  not_drawer: 'Only the player drawing can do that',
  not_choosing: 'There is no word to choose right now',
  already_guessed: 'You already guessed this turn',
  cooldown: 'Too fast, wait a moment',
  not_in_room: 'You are not in a room',
  already_in_room: 'You are already in another room; leave it first',
  session_expired: 'Your session has expired',
  internal: 'Unexpected server error',
};
