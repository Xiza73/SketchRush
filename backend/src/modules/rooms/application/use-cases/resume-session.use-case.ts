import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

/**
 * Puts a player back online without a token: the socket that comes back
 * through Socket.IO's connection state recovery *is* the previous socket, so
 * there is nothing to authenticate. It is `room:rejoin` minus the token check
 * and minus the state ack — the recovered socket already got the events it
 * missed.
 *
 * Returns false when the room or the seat is gone (the player left or the room
 * was deleted); the client then has to rejoin properly and hears
 * `session_expired`.
 */
@Injectable()
export class ResumeSessionUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(roomCode: string, playerId: string): boolean {
    const room = this.rooms.findByCode(roomCode);
    const player = room?.findPlayer(playerId);
    if (!room || !player) return false;
    const now = this.clock.now();
    player.markConnected();
    room.touch(now);
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
    return true;
  }
}
