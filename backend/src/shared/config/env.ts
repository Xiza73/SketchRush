/** Parses the comma-separated FRONTEND_URL allowlist; undefined means "allow all". */
export function parseAllowedOrigins(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return origins.length > 0 ? origins : undefined;
}

export function parsePort(raw: string | undefined, fallback = 3000): number {
  const port = Number(raw);
  return Number.isInteger(port) && port > 0 ? port : fallback;
}

/** Injection token for the room cap below. */
export const MAX_ROOMS = Symbol('MAX_ROOMS');

/**
 * How many rooms may exist at once. Rooms live in this process, so without a
 * ceiling a burst of creations ends in an out-of-memory restart, and a restart
 * drops every game in progress. The cap turns that into a refusal a player can
 * read. The default is a starting point, not a measurement: raise it once
 * `/health` shows what this deployment actually holds.
 */
export function parseMaxRooms(raw: string | undefined, fallback = 500): number {
  const max = Number(raw);
  return Number.isInteger(max) && max > 0 ? max : fallback;
}
