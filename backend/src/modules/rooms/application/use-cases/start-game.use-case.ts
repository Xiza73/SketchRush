import { Inject, Injectable } from '@nestjs/common';
import { ROOM_LIMITS } from '@shared/contract';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';

/**
 * The room's half of starting: may this room start, and move it out of the
 * lobby. **What** then happens belongs to the `game` module, which will hook
 * onto this transition to deal the first turn.
 *
 * Splitting it this way is deliberate. "Can we start?" is a question about
 * seats, a host and settings — it has the same answer in every game in this
 * family. "What starts" is the only part that differs.
 */
@Injectable()
export class StartGameUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(roomCode: string, playerId: string): void {
    const room = this.rooms.findByCode(roomCode);
    if (!room) throw new DomainException('room_not_found');
    if (room.status !== 'lobby') throw new DomainException('game_in_progress');

    const player = room.findPlayer(playerId);
    if (!player?.isHost) throw new DomainException('not_host');
    if (room.connectedPlayers().length < ROOM_LIMITS.minPlayers) {
      throw new DomainException('not_enough_players');
    }

    // Straight to `choosing`: the first drawer picks a word before anybody
    // draws anything. The `game` module fills that phase in.
    room.status = 'choosing';
    room.touch(this.clock.now());
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
  }
}
