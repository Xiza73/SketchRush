import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

/**
 * "Jugar de nuevo": the host turns a finished game back into the lobby it
 * came from (docs/context/02-game-rules.md -> "Playing again"). Same code,
 * same players and same settings; everything the game produced is dropped.
 * Only from `finished`: between rounds the game is still running.
 */
@Injectable()
export class RestartRoomUseCase {
  private readonly logger = new Logger(RestartRoomUseCase.name);

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(roomCode: string, playerId: string): void {
    const room = this.rooms.findByCode(roomCode);
    const player = room?.findPlayer(playerId);
    if (!room || !player) throw new DomainException('not_in_room');
    if (!player.isHost) throw new DomainException('not_host');
    if (room.status !== 'finished') {
      throw new DomainException('game_in_progress', 'The game has not finished yet');
    }

    room.resetForNewGame(this.clock.now());
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
    this.logger.log(`Room ${room.code}: restarted into a new lobby by ${player.name}`);
  }
}
