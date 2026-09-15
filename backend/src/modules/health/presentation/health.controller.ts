import { Controller, Get, Inject } from '@nestjs/common';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';

@Controller('health')
export class HealthController {
  constructor(@Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository) {}

  @Get()
  check(): { status: 'ok'; rooms: number } {
    return { status: 'ok', rooms: this.rooms.count() };
  }
}
