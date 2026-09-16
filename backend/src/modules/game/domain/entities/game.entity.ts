import type { TurnEndPayload } from '@shared/contract';
import type { Turn } from './turn.entity';

/**
 * Everything one room's game knows across turns: who draws in what order, which
 * words are spent, and the turn being played right now.
 *
 * It lives in the `game` module keyed by room code, **not** on the `Room`.
 * WordRush hung its round state off the room aggregate and the result was a
 * module called `rooms` that carried a whole game's vocabulary; this is the
 * thing that keeps `rooms` swappable.
 */
export class Game {
  /** The seats, in the order they were taken. Fixed when the game starts. */
  readonly order: readonly string[];
  readonly totalRounds: number;
  /** 1-based, counting only turns actually played. */
  turnNumber = 0;
  /** How many slots the rotation has walked, including skipped seats. Never wraps. */
  private cursor = 0;
  readonly usedWords: string[] = [];
  current: Turn | null = null;
  lastTurnEnd: TurnEndPayload | null = null;
  /** Epoch ms the next turn starts; null when nothing is scheduled. */
  nextTurnAt: number | null = null;

  constructor(
    readonly roomCode: string,
    order: readonly string[],
    totalRounds: number,
  ) {
    this.order = [...order];
    this.totalRounds = totalRounds;
  }

  /** Every seat draws once per round. */
  get totalTurns(): number {
    return this.order.length * this.totalRounds;
  }

  get round(): number {
    return Math.max(1, Math.ceil(this.turnNumber / Math.max(1, this.order.length)));
  }

  isOver(): boolean {
    return this.turnNumber >= this.totalTurns;
  }

  /**
   * Which seat draws at a given slot, rotating the order one place per round.
   *
   * Seats A, B, C draw A B C, then B C A, then C A B. A fixed order would hand
   * the same player the opening turn of every round — the one turn nobody gets
   * to warm up for by watching somebody else first — and hand the same player
   * the last word of the game every time. Rotating moves both around.
   *
   * The cost is that the gap between a player's turns stops being constant: A
   * draws at 1, 6 and 8 rather than 1, 4 and 7. Everybody still draws exactly
   * once per round, which is the part that decides the score.
   */
  private seatAt(slot: number): number {
    const seats = this.order.length;
    return (Math.floor(slot / seats) + slot) % seats;
  }

  /**
   * Who draws next, walking the rotation and skipping anybody who has left.
   * Returns null when nobody in the order is still seated — the caller ends the
   * game rather than looping forever.
   */
  takeNextDrawer(present: readonly string[]): string | null {
    const seated = new Set(present);
    for (let step = 0; step < this.order.length; step++) {
      const candidate = this.order[this.seatAt(this.cursor + step)];
      if (candidate !== undefined && seated.has(candidate)) {
        this.cursor += step + 1;
        return candidate;
      }
    }
    return null;
  }

  markWordUsed(word: string): void {
    this.usedWords.push(word);
  }
}
