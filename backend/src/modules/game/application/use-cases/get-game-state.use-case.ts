import { Inject, Injectable } from '@nestjs/common';
import type { TurnEndPayload, TurnState } from '@shared/contract';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';
import {
  GAME_REPOSITORY,
  IGameRepository,
} from '../../domain/interfaces/game-repository.interface';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';

export interface GameStateView {
  turn: TurnState | null;
  lastTurnEnd: TurnEndPayload | null;
}

/**
 * The game half of what a player gets when they create, join or rejoin a room.
 *
 * Read-only, and addressed to one player: the turn it returns carries the word
 * only when that player is the drawer. A reload mid-turn repaints the canvas
 * from here.
 */
@Injectable()
export class GetGameStateUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    private readonly lifecycle: TurnLifecycleService,
  ) {}

  execute(roomCode: string, playerId: string): GameStateView {
    const room = this.rooms.findByCode(roomCode);
    const game = this.games.find(roomCode);
    if (!room || !game) return { turn: null, lastTurnEnd: null };
    return {
      turn: this.lifecycle.stateFor(game, room, playerId),
      lastTurnEnd: game.lastTurnEnd,
    };
  }
}
