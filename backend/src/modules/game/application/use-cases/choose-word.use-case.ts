import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';
import {
  GAME_REPOSITORY,
  IGameRepository,
} from '../../domain/interfaces/game-repository.interface';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';

/** The drawer picks one of the three they were offered. */
@Injectable()
export class ChooseWordUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly lifecycle: TurnLifecycleService,
  ) {}

  execute(roomCode: string, playerId: string, index: number): void {
    const room = this.rooms.findByCode(roomCode);
    const game = this.games.find(roomCode);
    const turn = game?.current;
    if (!room || !game || !turn) throw new DomainException('not_in_turn');
    if (turn.phase !== 'choosing') throw new DomainException('not_choosing');
    if (turn.drawerId !== playerId) throw new DomainException('not_drawer');

    const word = turn.choices[index];
    if (word === undefined) throw new DomainException('invalid_payload');

    this.lifecycle.beginDrawing(game, room, word, this.clock.now());
  }
}
