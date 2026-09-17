import { Inject, Injectable } from '@nestjs/common';
import {
  COLOR_PATTERN,
  type FillPayload,
  type ShapePayload,
  type StrokePayload,
} from '@shared/contract';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import type { Turn } from '../../domain/entities/turn.entity';
import {
  GAME_REPOSITORY,
  IGameRepository,
} from '../../domain/interfaces/game-repository.interface';

/**
 * Everything the drawer does to the canvas. Each operation is appended to the
 * turn's buffer **and** relayed, so a player who reloads mid-turn repaints from
 * the buffer instead of landing on a blank sheet.
 */
@Injectable()
export class DrawUseCase {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    private readonly bus: RoomEventsBus,
  ) {}

  stroke(roomCode: string, playerId: string, payload: StrokePayload): void {
    const turn = this.requireDrawing(roomCode, playerId);
    const color = this.requireColor(payload.color);
    // Dropped by the buffer means dropped for everybody: relaying an operation
    // the server did not keep would leave whoever reloads next with a different
    // drawing from the one the room is looking at.
    if (!turn.addStroke(payload.id, payload.tool, color, payload.size, payload.points)) return;
    this.bus.publish({ roomCode, event: 'draw:stroke', payload });
  }

  shape(roomCode: string, playerId: string, payload: ShapePayload): void {
    const turn = this.requireDrawing(roomCode, playerId);
    const color = this.requireColor(payload.color);
    if (!turn.addShape(payload.id, payload.shape, color, payload.size, payload.from, payload.to)) {
      return;
    }
    this.bus.publish({ roomCode, event: 'draw:shape', payload });
  }

  fill(roomCode: string, playerId: string, payload: FillPayload): void {
    const turn = this.requireDrawing(roomCode, playerId);
    if (!turn.addFill(this.requireColor(payload.color), payload.at)) return;
    this.bus.publish({ roomCode, event: 'draw:fill', payload });
  }

  // Both are silent when there was nothing to do. An empty broadcast would make
  // every other screen bump its repaint generation and redraw the whole canvas
  // to arrive at the picture it already had.
  undo(roomCode: string, playerId: string): void {
    if (!this.requireDrawing(roomCode, playerId).undo()) return;
    this.bus.publish({ roomCode, event: 'draw:undo', payload: undefined });
  }

  redo(roomCode: string, playerId: string): void {
    const restored = this.requireDrawing(roomCode, playerId).redo();
    if (!restored) return;
    this.bus.publish({ roomCode, event: 'draw:redo', payload: restored });
  }

  clear(roomCode: string, playerId: string): void {
    this.requireDrawing(roomCode, playerId).clear();
    this.bus.publish({ roomCode, event: 'draw:clear', payload: undefined });
  }

  /** Only the drawer, and only while the turn is actually being drawn. */
  private requireDrawing(roomCode: string, playerId: string): Turn {
    const turn = this.games.find(roomCode)?.current;
    if (!turn || turn.phase !== 'drawing') throw new DomainException('not_in_turn');
    if (turn.drawerId !== playerId) throw new DomainException('not_drawer');
    return turn;
  }

  /**
   * Checked here as well as in the DTO. This string ends up on the canvas of
   * every other player in the room, and the buffer it is written into is
   * replayed to whoever joins next, so it is worth refusing twice.
   */
  private requireColor(color: string): string {
    if (!COLOR_PATTERN.test(color)) throw new DomainException('invalid_payload');
    return color;
  }
}
