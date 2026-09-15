/**
 * How long a room and its players survive without anybody connected.
 * Single source of truth for `docs/context/02-game-rules.md` ->
 * "Disconnections and room lifetime". Rooms live in memory and weigh a few KB;
 * these delays are hygiene, not cost. The frontend does not need them, so they
 * stay out of the socket contract.
 */
export const ROOM_LIFECYCLE = {
  /** How often the janitor sweeps. */
  janitorIntervalMs: 5_000,
  /** A player disconnected in the lobby this long is removed from it. */
  lobbyDisconnectGraceMs: 60_000,
  /** A room nobody is connected to (lobby or empty) is deleted after this. */
  abandonedTtlMs: 10 * 60_000,
  /** A finished game's room is deleted after this. */
  finishedTtlMs: 5 * 60_000,
} as const;
