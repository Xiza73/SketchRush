import { create } from 'zustand';

import { socket } from '@/core/session/lib/socket';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { ROOM_LIMITS, type Emote } from '@/shared/contract';

export interface LiveReaction {
  id: number;
  playerId: string;
  emote: Emote;
}

/** Matches the `sticker-flash` keyframe: the node goes as the animation ends. */
const STICKER_MS = 2500;

/** More than this on screen at once is confetti, not a reaction. */
const MAX_LIVE = 6;

interface ReactionsState {
  /** Stickers currently on screen, oldest first. */
  live: LiveReaction[];
  /** Epoch ms until sending is allowed again; 0 when free. */
  pausedUntil: number;
}

interface ReactionsActions {
  bind: () => void;
  /**
   * The server refused a send for flooding. The pause is mirrored here so the
   * button says so instead of swallowing taps — the rule itself stays on the
   * server, which is the only place that can see every one of my sockets.
   */
  pause: () => void;
  reset: () => void;
}

let bound = false;
let nextId = 1;

export const useReactionsStore = create<ReactionsState & ReactionsActions>((set) => ({
  live: [],
  pausedUntil: 0,

  bind: () => {
    if (bound) return;
    bound = true;

    socket.on('reaction:show', ({ playerId, emote }) => {
      const id = nextId++;
      set((state) => ({ live: [...state.live, { id, playerId, emote }].slice(-MAX_LIVE) }));
      window.setTimeout(() => {
        set((state) => ({ live: state.live.filter((item) => item.id !== id) }));
      }, STICKER_MS);
    });

    useSessionStore.subscribe((state, previous) => {
      if (!state.session && previous.session) set({ live: [], pausedUntil: 0 });
    });
  },

  pause: () => set({ pausedUntil: Date.now() + ROOM_LIMITS.emotePauseSeconds * 1000 }),

  reset: () => set({ live: [], pausedUntil: 0 }),
}));
