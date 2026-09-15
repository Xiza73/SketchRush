import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

/**
 * A socket dropped. The player and their round state are kept so a rejoin
 * can restore them; the lobby janitor removes lobby players that stay away.
 */
@Injectable()
export class MarkDisconnectedUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(roomCode: string, playerId: string): void {
    const room = this.rooms.findByCode(roomCode);
    const player = room?.findPlayer(playerId);
    if (!room || !player) return;
    player.markDisconnected(this.clock.now());
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
  }
}
