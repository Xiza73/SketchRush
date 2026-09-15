import type { LobbyState, RoomSettings, RoomStatus } from '@shared/contract';
import type { Player } from './player.entity';

/**
 * Aggregate root: a room, its seats and its settings. All mutation happens
 * through use cases in a single process, so no locking is needed.
 *
 * It holds **no game state**. WordRush put the answer, the used words and the
 * per-player round on this entity and on `Player`, which made a module called
 * `rooms` carry the whole of one game's vocabulary. Here the turn lives in the
 * `game` module keyed by room code, and this class stays the part that would
 * survive swapping the game out.
 *
 * `status` is the one exception, and it is genuinely shared: the lobby renders
 * from it, the client routes on it and the janitor prunes on it.
 */
export class Room {
  status: RoomStatus = 'lobby';
  readonly players: Player[] = [];
  lastActivityAt: number;
  finishedAt: number | null = null;
  /** Epoch ms at which the last player was removed; only set on an empty room. */
  emptiedAt: number | null = null;

  private constructor(
    readonly code: string,
    readonly settings: RoomSettings,
    readonly createdAt: number,
  ) {
    this.lastActivityAt = createdAt;
  }

  static create(code: string, settings: RoomSettings, now: number): Room {
    return new Room(code, settings, now);
  }

  get host(): Player | undefined {
    return this.players.find((p) => p.isHost);
  }

  findPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  hasName(name: string): boolean {
    const wanted = name.toLowerCase();
    return this.players.some((p) => p.name.toLowerCase() === wanted);
  }

  connectedPlayers(): Player[] {
    return this.players.filter((p) => p.connected);
  }

  isFull(): boolean {
    return this.players.length >= this.settings.capacity;
  }

  isEmpty(): boolean {
    return this.players.length === 0;
  }

  addPlayer(player: Player): void {
    this.players.push(player);
  }

  /**
   * Removes a player; if they were host, the oldest remaining **connected**
   * player takes over (the oldest of all, when nobody is connected).
   */
  removePlayer(id: string): Player | undefined {
    const index = this.players.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    const [removed] = this.players.splice(index, 1);
    if (removed.isHost && this.players.length > 0) {
      const byAge = [...this.players].sort((a, b) => a.joinedAt - b.joinedAt);
      const heir = byAge.find((p) => p.connected) ?? byAge[0];
      heir.isHost = true;
    }
    return removed;
  }

  touch(now: number): void {
    this.lastActivityAt = now;
  }

  /**
   * "Play again": the finished game is wiped and the room becomes the very
   * lobby it started as (docs/context/02-game-rules.md -> "Playing again").
   * Code, settings, host and the player list survive — disconnected players
   * included, so they can still come back. The `game` module drops its own
   * turn state for this room separately; what is cleared here is the seats and
   * the janitor's `finishedAt` marker, so the room is judged by lobby rules
   * again and is never deleted as "a finished game".
   */
  resetForNewGame(now: number): void {
    this.status = 'lobby';
    this.finishedAt = null;
    this.emptiedAt = null;
    for (const player of this.players) player.resetForNewGame(now);
    this.touch(now);
  }

  /**
   * Replaces the settings in place (the reference is shared with whatever the
   * turn already read). Only legal in the lobby: the use case checks the
   * status and that the new capacity still fits everybody in the room.
   */
  updateSettings(next: RoomSettings): void {
    Object.assign(this.settings, next);
  }

  /**
   * Epoch ms since which nobody has been connected; null while someone is.
   * An empty room keeps the moment it was emptied, so the abandonment clock
   * does not restart when its last player is removed.
   */
  lastDisconnectionAt(): number | null {
    if (this.players.some((p) => p.connected)) return null;
    if (this.players.length === 0) return this.emptiedAt ?? this.lastActivityAt;
    return Math.max(...this.players.map((p) => p.disconnectedAt ?? this.createdAt));
  }

  toLobbyState(): LobbyState {
    return {
      code: this.code,
      status: this.status,
      settings: { ...this.settings },
      players: this.players.map((p) => p.toPublic()),
    };
  }
}
