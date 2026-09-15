import { Inject, Injectable } from '@nestjs/common';
import { DomainException } from '@shared/domain/domain.exception';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

/** What the caller's transport remembers about its current seat. */
export interface Membership {
  roomCode?: string;
  playerId?: string;
}

/**
 * Server-side safety net for "one game at a time"
 * (docs/context/02-game-rules.md -> "One game at a time"): a caller that still
 * holds a seat in a live room cannot create or join another one. A seat in a
 * finished or already deleted room is stale and does not block anything.
 */
@Injectable()
export class EnsureNotInRoomUseCase {
  constructor(@Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository) {}

  execute(membership: Membership | null | undefined): void {
    const roomCode = membership?.roomCode;
    const playerId = membership?.playerId;
    if (!roomCode || !playerId) return;
    const room = this.rooms.findByCode(roomCode);
    if (!room || room.status === 'finished') return;
    if (!room.findPlayer(playerId)) return;
    throw new DomainException('already_in_room');
  }
}
