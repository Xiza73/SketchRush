import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { MAX_ROOMS } from '@shared/config/env';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';
import { generateRoomCode } from '../../domain/services/room-code.generator';
import { CreateRoomDto } from '../dtos/create-room.dto';

export interface RoomSession {
  room: Room;
  player: Player;
}

export function newPlayerToken(): string {
  return randomBytes(24).toString('base64url');
}

@Injectable()
export class CreateRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAX_ROOMS) private readonly maxRooms: number,
  ) {}

  execute(dto: CreateRoomDto): RoomSession {
    // Rooms live in this process. Past the cap the next allocation is an
    // out-of-memory restart, and a restart drops every game in progress;
    // refusing one creation is the far kinder failure.
    if (this.rooms.count() >= this.maxRooms) throw new DomainException('server_full');
    const now = this.clock.now();
    const code = generateRoomCode((c) => this.rooms.exists(c));
    const room = Room.create(code, { ...dto.settings }, now);
    const player = Player.create({
      id: randomUUID(),
      token: newPlayerToken(),
      name: dto.name,
      isHost: true,
      joinedAt: now,
    });
    room.addPlayer(player);
    this.rooms.save(room);
    return { room, player };
  }
}
