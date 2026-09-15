import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';
import {
  GAME_REPOSITORY,
  IGameRepository,
} from '../../domain/interfaces/game-repository.interface';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';

/**
 * Settles the turn when somebody gives up their seat mid-game.
 *
 * Called after the room has already dropped them, so `room.players` is the list
 * that is left. Two things can strand a room: the drawer walking out, and the
 * last player who had not guessed yet walking out. Both end the turn now rather
 * than leaving everybody watching a clock that no longer means anything.
 */
@Injectable()
export class HandlePlayerLeftUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly lifecycle: TurnLifecycleService,
  ) {}

  execute(roomCode: string, playerId: string): void {
    const room = this.rooms.findByCode(roomCode);
    const game = this.games.find(roomCode);
    const turn = game?.current;
    if (!room || !game || !turn || turn.phase === 'ended') return;

    const drawerLeft = turn.drawerId === playerId;
    // Their guess, if they made one, left with them; what is left is whether
    // the players still here have all had their turn at it.
    const everybodyElseIsDone =
      turn.phase === 'drawing' && turn.everybodyGuessed(room.players.map((player) => player.id));

    if (drawerLeft || everybodyElseIsDone || room.players.length < 2) {
      this.lifecycle.endTurn(game, room, this.clock.now());
    }
  }
}
