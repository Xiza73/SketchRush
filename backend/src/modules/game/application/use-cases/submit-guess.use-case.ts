import { Inject, Injectable } from '@nestjs/common';
import { SCORING, type GuessAck } from '@shared/contract';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';
import {
  GAME_REPOSITORY,
  IGameRepository,
} from '../../domain/interfaces/game-repository.interface';
import { judgeGuess, revealsAnswer } from '../../domain/services/guess-match';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';

/**
 * One attempt at the word.
 *
 * Everything the guesser learns comes back in the ack, and only in the ack: the
 * room is told *that* somebody got it and where they placed, never what anybody
 * typed. A `chat` room additionally broadcasts the message — but never one that
 * contains the answer, whoever sent it.
 */
@Injectable()
export class SubmitGuessUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
    private readonly lifecycle: TurnLifecycleService,
  ) {}

  execute(roomCode: string, playerId: string, text: string): GuessAck {
    const room = this.rooms.findByCode(roomCode);
    const game = this.games.find(roomCode);
    const turn = game?.current;
    if (!room || !game || !turn) throw new DomainException('not_in_turn');
    if (turn.phase !== 'drawing') throw new DomainException('not_in_turn');
    if (turn.drawerId === playerId) throw new DomainException('not_drawer');
    if (turn.hasGuessed(playerId)) throw new DomainException('already_guessed');

    const now = this.clock.now();
    const verdict = judgeGuess(text, turn.word ?? '');

    if (verdict !== 'correct') {
      if (room.settings.guessMode === 'chat') {
        // A chat room repeats what was typed — unless it gives the word away,
        // which someone who already knows it could do by accident or on purpose.
        if (!revealsAnswer(text, turn.word ?? '')) {
          this.bus.publish({
            roomCode: room.code,
            event: 'chat:message',
            payload: { playerId, text },
          });
        }
      } else {
        // A box room tells the drawer alone that somebody tried and how near
        // they got. They have nothing to type and no other way to know whether
        // the drawing is working; the text itself stays private, which is the
        // whole promise a box room makes to the people guessing.
        this.bus.publish({
          roomCode: room.code,
          event: 'guess:attempt',
          payload: { playerId, close: verdict === 'close' },
          toPlayerId: turn.drawerId,
        });
      }
      return { correct: false, close: verdict === 'close', position: null, points: 0 };
    }

    const record = turn.recordGuess(playerId, now);
    const points = record.timePercent + (SCORING.positionBonus[record.position - 1] ?? 0);

    this.bus.publish({
      roomCode: room.code,
      event: 'player:guessed',
      payload: { playerId, position: record.position, points },
    });

    // Last one in: close the turn now rather than waiting for the clock.
    if (turn.everybodyGuessed(room.players.map((player) => player.id))) {
      this.lifecycle.endTurn(game, room, now);
    }

    return { correct: true, close: false, position: record.position, points };
  }
}
