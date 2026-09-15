import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

@Injectable()
export class SetReadyUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(roomCode: string, playerId: string, ready: boolean): void {
    const room = this.rooms.findByCode(roomCode);
    const player = room?.findPlayer(playerId);
    if (!room || !player) throw new DomainException('not_in_room');
    player.ready = ready;
    room.touch(this.clock.now());
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
  }
}
