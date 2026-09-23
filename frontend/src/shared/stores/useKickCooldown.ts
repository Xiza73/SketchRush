import { useEffect } from 'react';
import { create } from 'zustand';

import { serverNow } from '@/core/session/lib/serverClock';
import { useNow } from '@/shared/hooks/useNow';

/** A name the host threw out of a room, and when it may go back in. */
export interface KickBlock {
  roomCode: string;
  /** Trimmed and lower-cased, the way the server compares it. */
  name: string;
  /** Epoch ms. */
  until: number;
}

interface KickCooldownState {
  block: KickBlock | null;
}

interface KickCooldownActions {
  /** Starts (or restarts) the block; `seconds` is what the server says is left. */
  start: (roomCode: string, name: string, seconds: number) => void;
  clear: () => void;
}

const codeKey = (code: string) => code.trim().toUpperCase();
const nameKey = (name: string) => name.trim().toLowerCase();

/**
 * The 30 s a kicked name waits before that room takes it back
 * (docs/context/02-game-rules.md -> "The host can throw somebody out"). It is kept here, outside the
 * session, because the session is exactly what the kick took away: the block
 * outlives it and belongs to the join view.
 *
 * Only one is ever held — a browser plays one game at a time — and it is set
 * twice over: when the kick arrives (the whole 30 s) and again on a refused
 * join (`retryAfterSeconds`, the truth from the server's own clock).
 *
 * The deadline is stamped with `serverNow()`, not `Date.now()`, because
 * `useNow` reads the server clock here (unlike WordRush, where it reads the
 * local one). Mixing the two makes the countdown wrong by the offset.
 */
export const useKickCooldownStore = create<KickCooldownState & KickCooldownActions>((set) => ({
  block: null,
  start: (roomCode, name, seconds) =>
    set({
      block: {
        roomCode: codeKey(roomCode),
        name: nameKey(name),
        until: serverNow() + Math.max(0, seconds) * 1000,
      },
    }),
  clear: () => set({ block: null }),
}));

export const kickCooldown = {
  start: (roomCode: string, name: string, seconds: number) =>
    useKickCooldownStore.getState().start(roomCode, name, seconds),
};

/** The block that applies to this room and name, or null. Case and space blind. */
export const blockFor = (
  block: KickBlock | null,
  roomCode: string,
  name: string,
): KickBlock | null =>
  block && block.roomCode === codeKey(roomCode) && block.name === nameKey(name) ? block : null;

/**
 * Seconds still to wait, 0 when the door is open. Rounded up so the last
 * fraction of a second reads "1" and never a "0" that refuses anyway — the
 * same rounding the server does, or the two would disagree at the edge.
 *
 * `now` must come from the **server** clock, because `until` was stamped with
 * it. Pure so it can be checked without a DOM; `useNow` is driven by
 * requestAnimationFrame, which does not run in a hidden tab.
 */
export const secondsLeftFor = (block: KickBlock | null, now: number): number =>
  block ? Math.max(0, Math.ceil((block.until - now) / 1000)) : 0;

/**
 * Seconds this name still has to wait before it may join this room, 0 when it
 * may go in now. It re-renders every quarter second while the block runs, so
 * the notice counts down live; when it reaches zero the block is dropped and
 * the clock stops.
 */
export const useKickCooldown = (roomCode: string, name: string): number => {
  const block = useKickCooldownStore((state) => state.block);
  const clear = useKickCooldownStore((state) => state.clear);
  const mine = blockFor(block, roomCode, name);
  const now = useNow(250, mine !== null);
  const left = secondsLeftFor(mine, now);

  useEffect(() => {
    if (mine && left === 0) clear();
  }, [mine, left, clear]);

  return left;
};
