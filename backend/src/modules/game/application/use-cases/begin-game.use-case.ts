import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';
import { Game } from '../../domain/entities/game.entity';
import {
  GAME_REPOSITORY,
  IGameRepository,
} from '../../domain/interfaces/game-repository.interface';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';

/**
 * The second half of starting, and only the second half.
 *
 * `rooms`' own `StartGameUseCase` has already answered "may this room start?" —
 * host, minimum players, status — because that question has the same answer in
 * every game in this family. This one deals the first turn, which is the part
 * that does not.
 */
@Injectable()
export class BeginGameUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly lifecycle: TurnLifecycleService,
  ) {}

  execute(roomCode: string): void {
    const room = this.rooms.findByCode(roomCode);
    if (!room) throw new DomainException('room_not_found');

    // The order is fixed here and never re-shuffled: a player who leaves is
    // skipped, not replaced, so everybody keeps the position they started with.
    const game = new Game(
      room.code,
      room.players.map((player) => player.id),
      room.settings.rounds,
    );
    this.games.save(game);

    if (!this.lifecycle.startTurn(game, room, this.clock.now())) {
      throw new DomainException('not_enough_players');
    }
  }
}
