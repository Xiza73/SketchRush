import type { Game } from '../entities/game.entity';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

/**
 * Where a room's game state lives. In-memory in v1, keyed by room code; the
 * interface is the seam for a Redis-backed implementation if the server ever
 * runs more than one process.
 */
export interface IGameRepository {
  find(roomCode: string): Game | undefined;
  save(game: Game): void;
  delete(roomCode: string): void;
  all(): Game[];
}
