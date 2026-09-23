import { Inject, Injectable, Logger } from '@nestjs/common';
import { ROOM_LIMITS } from '@shared/contract';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

/**
 * The host throws a player out (docs/context/02-game-rules.md -> "The host can
 * throw somebody out"). The victim is told and their name may not join this
 * room again for 30 s; the caller then detaches their socket and removes them
 * exactly as if they had left (`LeaveRoomUseCase`), so the victim never hears
 * the room talk about their own removal.
 */
@Injectable()
export class KickPlayerUseCase {
  private readonly logger = new Logger(KickPlayerUseCase.name);

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  /** Returns the id of the player to remove. */
  execute(roomCode: string, hostId: string, targetId: string): string {
    const room = this.rooms.findByCode(roomCode);
    const host = room?.findPlayer(hostId);
    if (!room || !host) throw new DomainException('not_in_room');
    if (!host.isHost) throw new DomainException('not_host');
    const target = room.findPlayer(targetId);
    if (!target || target.id === host.id) {
      throw new DomainException('invalid_payload', 'No such player in the room');
    }

    const now = this.clock.now();
    room.blockName(target.name, now + ROOM_LIMITS.kickRejoinSeconds * 1000);
    this.bus.publish({
      roomCode: room.code,
      toPlayerId: target.id,
      event: 'room:kicked',
      payload: { roomCode: room.code, rejoinAfterSeconds: ROOM_LIMITS.kickRejoinSeconds },
    });
    this.logger.log(`Room ${room.code}: ${host.name} kicked ${target.name}`);
    return target.id;
  }
}
