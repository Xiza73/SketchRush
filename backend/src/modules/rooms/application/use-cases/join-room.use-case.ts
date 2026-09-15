import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '../../domain/entities/player.entity';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';
import { JoinRoomDto } from '../dtos/join-room.dto';
import { newPlayerToken, RoomSession } from './create-room.use-case';

@Injectable()
export class JoinRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(dto: JoinRoomDto): RoomSession {
    const room = this.rooms.findByCode(dto.roomCode);
    if (!room) throw new DomainException('room_not_found');
    if (room.status !== 'lobby') throw new DomainException('game_in_progress');
    if (room.isFull()) throw new DomainException('room_full');
    if (room.hasName(dto.name)) throw new DomainException('name_taken');

    const now = this.clock.now();
    const player = Player.create({
      id: randomUUID(),
      token: newPlayerToken(),
      name: dto.name,
      isHost: false,
      joinedAt: now,
    });
    room.addPlayer(player);
    room.touch(now);
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
    return { room, player };
  }
}
