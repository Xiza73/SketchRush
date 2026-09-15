import { Inject, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';
import { RejoinRoomDto } from '../dtos/rejoin-room.dto';
import { RoomSession } from './create-room.use-case';

function tokenMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Re-attaches a returning client (page reload, new socket) to its player. */
@Injectable()
export class RejoinRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(dto: RejoinRoomDto): RoomSession {
    const room = this.rooms.findByCode(dto.roomCode);
    if (!room) throw new DomainException('room_not_found');
    const player = room.findPlayer(dto.playerId);
    if (!player || !tokenMatches(player.token, dto.token)) {
      throw new DomainException('session_expired');
    }
    const now = this.clock.now();
    player.markConnected();
    room.touch(now);
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
    return { room, player };
  }
}
