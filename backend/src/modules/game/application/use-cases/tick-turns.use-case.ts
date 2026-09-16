import { Inject, Injectable, Logger } from '@nestjs/common';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';
import type { Game } from '../../domain/entities/game.entity';
import {
  GAME_REPOSITORY,
  IGameRepository,
} from '../../domain/interfaces/game-repository.interface';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';

/** One pass of the game loop over every room that has a game running. */
@Injectable()
export class TickTurnsUseCase {
  private readonly logger = new Logger(TickTurnsUseCase.name);
  /**
   * Rooms whose last tick threw, cleared as soon as one succeeds. A room that
   * fails deterministically would otherwise be reported four times a second for
   * as long as it exists.
   */
  private readonly failing = new Set<string>();

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    private readonly bus: RoomEventsBus,
    private readonly lifecycle: TurnLifecycleService,
  ) {}

  execute(now: number): void {
    for (const game of this.games.all()) {
      // The guard is per room, not around the loop. WordRush had it outside and
      // one room that threw stopped every room created after it from being
      // ticked at all, silently, four times a second, for good.
      try {
        this.tickOne(game, now);
        this.failing.delete(game.roomCode);
      } catch (error: unknown) {
        if (this.failing.has(game.roomCode)) continue;
        this.failing.add(game.roomCode);
        this.logger.error(
          `Tick failed for room ${game.roomCode}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  private tickOne(game: Game, now: number): void {
    const room = this.rooms.findByCode(game.roomCode);
    // The janitor took the room; the game has nothing left to run.
    if (!room) {
      this.games.delete(game.roomCode);
      return;
    }

    const turn = game.current;

    if (turn?.phase === 'choosing' && turn.chooseDeadlineAt <= now) {
      // Out of time to pick: the first option is taken for them. Better a word
      // they did not choose than a room waiting on somebody who walked away.
      const first = turn.choices[0];
      if (first) this.lifecycle.beginDrawing(game, room, first.word, now);
      return;
    }

    if (turn?.phase === 'drawing') {
      if (turn.releaseDueHints(now)) {
        this.bus.publish({
          roomCode: room.code,
          event: 'turn:hint',
          payload: { masked: turn.masked() },
        });
      }
      if (turn.isOutOfTime(now)) this.lifecycle.endTurn(game, room, now);
      return;
    }

    if (game.nextTurnAt !== null && game.nextTurnAt <= now) {
      game.nextTurnAt = null;
      if (!this.lifecycle.startTurn(game, room, now)) {
        // Nobody left in the order to draw: stop rather than spin.
        room.status = 'finished';
        room.finishedAt = now;
      }
    }
  }
}
