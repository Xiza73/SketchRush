import type { Room } from '../entities/room.entity';

export const ROOM_REPOSITORY = Symbol('ROOM_REPOSITORY');

/**
 * Room store. In-memory in v1; the interface is the seam for a Redis-backed
 * implementation if the server ever runs more than one process.
 */
export interface IRoomRepository {
  findByCode(code: string): Room | undefined;
  exists(code: string): boolean;
  save(room: Room): void;
  delete(code: string): void;
  all(): Room[];
  count(): number;
}
