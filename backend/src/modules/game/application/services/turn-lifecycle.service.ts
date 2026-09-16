import { Inject, Injectable } from '@nestjs/common';
import {
  ROOM_LIMITS,
  type PlayerTurnState,
  type TurnEndPayload,
  type TurnState,
} from '@shared/contract';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import type { Room } from '@modules/rooms/domain/entities/room.entity';
import { IWordPicker, WORD_PICKER } from '@modules/words/domain/interfaces/word-picker.interface';
import { Game } from '../../domain/entities/game.entity';
import { Turn } from '../../domain/entities/turn.entity';
import { computeStandings, scoreTurn } from '../../domain/services/scoring';

/**
 * Starting and ending a turn, in one place because four callers need them: the
 * host pressing start, the drawer choosing, the ticker running the clock out,
 * and the last guess landing.
 */
@Injectable()
export class TurnLifecycleService {
  constructor(
    private readonly bus: RoomEventsBus,
    @Inject(WORD_PICKER) private readonly words: IWordPicker,
  ) {}

  /** What one player is allowed to see of the turn. Only the drawer gets the word. */
  stateFor(game: Game, room: Room, playerId: string): TurnState | null {
    const turn = game.current;
    if (!turn) return null;
    return {
      turn: turn.turn,
      round: turn.round,
      totalRounds: game.totalRounds,
      drawerId: turn.drawerId,
      drawSeconds: turn.drawSeconds,
      startedAt: turn.startedAt,
      masked: turn.masked(),
      word: playerId === turn.drawerId ? turn.word : null,
      canvas: turn.canvas,
      players: turnPlayers(turn, room),
    };
  }

  /**
   * Deals the next turn. Returns false when nobody is left to draw, which is
   * the caller's cue to end the game rather than loop.
   */
  startTurn(game: Game, room: Room, now: number): boolean {
    const present = room.connectedPlayers().map((player) => player.id);
    const drawerId = game.takeNextDrawer(
      present.length > 0 ? present : room.players.map((p) => p.id),
    );
    if (!drawerId) return false;

    game.turnNumber += 1;
    const turn = new Turn({
      turn: game.turnNumber,
      round: game.round,
      drawerId,
      drawSeconds: room.settings.drawSeconds,
      hints: room.settings.hints,
    });
    turn.offer(
      this.words.pick(room.settings.language, ROOM_LIMITS.wordChoices, game.usedWords),
      now,
      ROOM_LIMITS.chooseSeconds,
    );
    game.current = turn;
    game.nextTurnAt = null;
    room.status = 'choosing';
    room.touch(now);

    // Everybody gets the turn; only the drawer gets the choices.
    for (const player of room.players) {
      this.bus.publish({
        roomCode: room.code,
        event: 'turn:start',
        payload: this.stateFor(game, room, player.id)!,
        toPlayerId: player.id,
      });
    }
    this.bus.publish({
      roomCode: room.code,
      event: 'turn:choices',
      payload: { choices: turn.choices, deadline: turn.chooseDeadlineAt },
      toPlayerId: drawerId,
    });
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
    return true;
  }

  /** The drawer picked, or the clock picked for them. */
  beginDrawing(game: Game, room: Room, word: string, now: number): void {
    const turn = game.current;
    if (!turn || turn.phase !== 'choosing') return;
    turn.begin(word, now);
    game.markWordUsed(word);
    room.status = 'drawing';
    room.touch(now);
    for (const player of room.players) {
      this.bus.publish({
        roomCode: room.code,
        event: 'turn:start',
        payload: this.stateFor(game, room, player.id)!,
        toPlayerId: player.id,
      });
    }
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
  }

  /** Scores the turn, publishes it, and either schedules the next or ends the game. */
  endTurn(game: Game, room: Room, now: number): void {
    const turn = game.current;
    if (!turn || turn.phase === 'ended') return;
    // A turn the drawer left before picking has no word and nothing to score.
    // Reporting it as a turn:end would put an empty reveal on everybody's
    // screen; it is dropped and the rotation moves on instead.
    const abandoned = turn.phase === 'choosing';
    turn.end();

    // Scored once, then written onto the players, so the standings below and
    // the breakdown the room sees can never tell two different stories.
    const breakdown = abandoned
      ? []
      : scoreTurn({
          drawerId: turn.drawerId,
          players: room.players.map((player) => ({ id: player.id, name: player.name })),
          guesses: turn.guesses,
        });

    for (const row of breakdown) {
      const player = room.findPlayer(row.playerId);
      if (!player) continue;
      player.totalPoints += row.turnPoints;
      if (row.guessed) player.guessedTurns += 1;
    }
    for (const guess of turn.guesses) {
      const player = room.findPlayer(guess.playerId);
      if (player) player.secondsUsed += guess.secondsUsed;
    }

    const standings = computeStandings(
      room.players.map((player) => ({
        playerId: player.id,
        name: player.name,
        total: player.totalPoints,
        guessed: player.guessedTurns,
        secondsUsed: player.secondsUsed,
      })),
    );

    // A room of one is not a game: below the minimum the rotation stops rather
    // than dealing turns to somebody drawing for nobody.
    const over = game.isOver() || room.connectedPlayers().length < ROOM_LIMITS.minPlayers;
    if (!abandoned) {
      const payload: TurnEndPayload = {
        turn: turn.turn,
        totalTurns: game.totalTurns,
        word: turn.word ?? '',
        breakdown,
        standings,
        nextTurnIn: over ? 0 : ROOM_LIMITS.betweenTurnsSeconds,
      };
      game.lastTurnEnd = payload;
      this.bus.publish({ roomCode: room.code, event: 'turn:end', payload });
    }

    if (over) {
      room.status = 'finished';
      room.finishedAt = now;
      game.nextTurnAt = null;
      this.bus.publish({
        roomCode: room.code,
        event: 'game:end',
        payload: { standings, rounds: game.totalRounds },
      });
    } else {
      room.status = 'between-turns';
      game.nextTurnAt = now + ROOM_LIMITS.betweenTurnsSeconds * 1000;
    }
    room.touch(now);
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
  }
}

/**
 * Every seat, not only the ones who got it: the panel has to show who is still
 * thinking, and a list that only grows tells you nothing about the rest.
 */
function turnPlayers(turn: Turn, room: Room): PlayerTurnState[] {
  return room.players.map((player) => {
    const guess = turn.guesses.find((entry) => entry.playerId === player.id);
    return {
      playerId: player.id,
      guessed: guess !== undefined,
      position: guess?.position ?? null,
      // Points are settled at turn:end; nothing is final while it is running.
      points: 0,
    };
  });
}
