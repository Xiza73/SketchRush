import type { FullState, TurnEndPayload, TurnState } from '@shared/contract';
import type { Room } from '../entities/room.entity';

/**
 * The room's half of the snapshot a client gets on create, join or rejoin.
 *
 * The turn is passed in rather than read: `rooms` owns seats and settings, the
 * `game` module owns what is being played, and the dependency runs that way
 * round. Whoever calls this already holds both.
 */
export function toFullState(
  room: Room,
  turn: TurnState | null,
  lastTurnEnd: TurnEndPayload | null,
): FullState {
  return {
    lobby: room.toLobbyState(),
    turn,
    lastTurnEnd,
  };
}
