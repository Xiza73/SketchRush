import type { PlayerPublic } from '@shared/contract';

export interface PlayerProps {
  id: string;
  token: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

/**
 * A seat in a room. Deliberately knows nothing about what the room is playing:
 * the state of a turn lives in the `game` module, keyed by room code, so this
 * entity stays the same whatever game is bolted on top of it.
 *
 * The three totals below are the exception, and only because `Standing` is a
 * shared contract shape: the `game` module writes them, nothing here reads them.
 */
export class Player {
  readonly id: string;
  /** Secret handed to the owning client; proves identity on rejoin. */
  readonly token: string;
  readonly name: string;
  readonly joinedAt: number;
  isHost: boolean;
  ready = false;
  connected = true;
  disconnectedAt: number | null = null;
  /** Accumulated across turns (the standings). */
  totalPoints = 0;
  /** Tie-break 1: turns this player guessed. */
  guessedTurns = 0;
  /** Tie-break 2: seconds spent before guessing, summed across turns. */
  secondsUsed = 0;
  /** Epoch ms of the emote sends inside the current burst window. */
  reactionTimes: number[] = [];
  /** Epoch ms until which emotes are refused after a burst; 0 when free. */
  reactionPausedUntil = 0;

  private constructor(props: PlayerProps) {
    this.id = props.id;
    this.token = props.token;
    this.name = props.name;
    this.isHost = props.isHost;
    this.joinedAt = props.joinedAt;
  }

  static create(props: PlayerProps): Player {
    return new Player(props);
  }

  markConnected(): void {
    this.connected = true;
    this.disconnectedAt = null;
  }

  markDisconnected(now: number): void {
    this.connected = false;
    this.disconnectedAt = now;
  }

  /**
   * Back to how the player entered the lobby the first time: no ready flag and
   * no totals. Somebody who is away keeps their seat but their lobby grace
   * period starts again with the new lobby, so a restart does not hand the
   * janitor a stale `disconnectedAt` to prune them with.
   */
  resetForNewGame(now: number): void {
    this.ready = false;
    this.totalPoints = 0;
    this.guessedTurns = 0;
    this.secondsUsed = 0;
    if (!this.connected) this.disconnectedAt = now;
  }

  toPublic(): PlayerPublic {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      ready: this.ready,
      connected: this.connected,
    };
  }
}
