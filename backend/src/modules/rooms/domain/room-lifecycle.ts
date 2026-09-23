/**
 * How long a room survives without anybody connected.
 * Single source of truth for `docs/context/02-game-rules.md` ->
 * "Leaving, disconnections, room lifetime". Rooms live in memory and weigh a
 * few KB; these delays are hygiene, not cost. The frontend does not need them,
 * so they stay out of the socket contract.
 *
 * A disconnected player is **never** removed from a live room (decided
 * 2026-09-22): they stay listed with `connected: false` and come back to the
 * same seat. Only leaving, or the whole room going away, frees a seat. What the
 * janitor still does is delete rooms nobody is in.
 */
export const ROOM_LIFECYCLE = {
  /** How often the janitor sweeps. */
  janitorIntervalMs: 5_000,
  /** A room nobody is connected to (lobby, playing or empty) is deleted after this. */
  abandonedTtlMs: 60 * 60_000,
  /** A finished game's room is deleted after this. */
  finishedTtlMs: 5 * 60_000,
} as const;
