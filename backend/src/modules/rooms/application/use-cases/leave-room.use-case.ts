import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

/**
 * Removes a player for good (`room:leave`), from the lobby, mid-round or on
 * the results screen. Unlike a disconnection this frees the seat: the stored
 * token stops working (`session_expired` on rejoin).
 *
 * Mid-turn, ending the turn they were part of belongs to the  module —
 * this one only frees the seat and says who is gone. Host leaving promotes the
 * oldest remaining connected player; an empty room is deleted. Idempotent:
 * leaving twice is a no-op.
 */
@Injectable()
export class LeaveRoomUseCase {
  private readonly logger = new Logger(LeaveRoomUseCase.name);

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(roomCode: string, playerId: string): void {
    const room = this.rooms.findByCode(roomCode);
    const player = room?.findPlayer(playerId);
    if (!room || !player) return;

    const now = this.clock.now();
    const wasHost = player.isHost;

    const removed = room.removePlayer(playerId);
    if (!removed) return;

    if (room.isEmpty()) {
      this.rooms.delete(room.code);
      this.logger.log(`Room ${room.code} deleted (empty)`);
      return;
    }

    room.touch(now);
    this.bus.publish({
      roomCode: room.code,
      event: 'player:left',
      payload: {
        playerId: removed.id,
        name: removed.name,
        newHostId: wasHost ? (room.host?.id ?? null) : null,
      },
    });
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
  }
}
