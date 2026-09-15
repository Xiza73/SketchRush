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
  /** Drawing order, fixed when the game starts. */
  readonly order: readonly string[];
  readonly totalRounds: number;
  /** 1-based, counting only turns actually played. */
  turnNumber = 0;
  /** How far through `order` the rotation has walked, including skipped seats. */
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
   * Who draws next, walking the fixed order and skipping anybody who has left.
   * Returns null when nobody in the order is still seated — the caller ends the
   * game rather than looping forever.
   */
  takeNextDrawer(present: readonly string[]): string | null {
    const seated = new Set(present);
    for (let step = 0; step < this.order.length; step++) {
      const candidate = this.order[(this.cursor + step) % this.order.length];
      if (candidate !== undefined && seated.has(candidate)) {
        this.cursor = (this.cursor + step + 1) % this.order.length;
        return candidate;
      }
    }
    return null;
  }

  markWordUsed(word: string): void {
    this.usedWords.push(word);
  }
}
