/** Seconds → `mm:ss` (clock) or `m:ss` (feed timestamps). */
export const formatClock = (seconds: number, padMinutes = true): string => {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  const mm = padMinutes ? String(minutes).padStart(2, '0') : String(minutes);
  return `${mm}:${String(rest).padStart(2, '0')}`;
};

/** Seconds left right now, derived from a server snapshot. Never negative. */
export const secondsLeftAt = (snapshot: { secondsLeft: number; at: number }, now: number) =>
  Math.max(0, snapshot.secondsLeft - (now - snapshot.at) / 1000);

export const percentOf = (seconds: number, initialSeconds: number): number =>
  initialSeconds > 0 ? Math.round((seconds / initialSeconds) * 100) : 0;

export const initialOf = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
