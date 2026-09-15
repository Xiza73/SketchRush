import { create } from 'zustand';

import { socket } from '@/core/session/lib/socket';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import type { DrawOp, FullState, WordChoicesPayload } from '@/shared/contract';

import { appendOp, toTurnViewModel, type FeedEntry, type TurnViewModel } from '../models/turn.model';

interface TurnStoreState {
  turn: TurnViewModel | null;
  /** The drawing so far. Kept apart from `turn` so a stroke does not rebuild it. */
  ops: DrawOp[];
  /**
   * Bumped whenever `ops` stops being an extension of what is already painted
   * (a new turn, an undo, a clear). The canvas repaints from scratch on a bump
   * and only draws the tail otherwise.
   */
  generation: number;
  /** The three words, drawer only. */
  choices: WordChoicesPayload | null;
  feed: FeedEntry[];
  /** True once I have this turn's word; the input closes and the panel says so. */
  iGuessed: boolean;
}

interface TurnActions {
  bind: () => void;
  /** The drawer's own strokes: applied locally, then sent. */
  pushLocalOp: (op: DrawOp) => void;
  undoLocal: () => void;
  clearLocal: () => void;
  clearChoices: () => void;
  note: (entry: Omit<FeedEntry, 'id'>) => void;
  reset: () => void;
}

let bound = false;
let feedId = 0;

/** Enough to follow the room, short enough that nobody scrolls a wall of text. */
const FEED_LIMIT = 60;

const myId = () => useSessionStore.getState().session?.playerId ?? null;

const initialState: TurnStoreState = {
  turn: null,
  ops: [],
  generation: 0,
  choices: null,
  feed: [],
  iGuessed: false,
};

export const useTurnStore = create<TurnStoreState & TurnActions>((set, get) => {
  const pushFeed = (entry: Omit<FeedEntry, 'id'>) =>
    set((state) => ({ feed: [...state.feed, { ...entry, id: ++feedId }].slice(-FEED_LIMIT) }));

  /** True when the incoming draw event is the echo of something I just drew. */
  const isMyEcho = () => {
    const turn = get().turn;
    return turn !== null && turn.drawerId === myId();
  };

  const hydrate = (snapshot: FullState) => {
    const dto = snapshot.turn;
    if (!dto) {
      set(initialState);
      return;
    }
    const mine = myId();
    set((state) => ({
      turn: toTurnViewModel(dto),
      ops: dto.canvas,
      generation: state.generation + 1,
      choices: null,
      // A reload mid-turn keeps the feed it never saw empty rather than faking it.
      feed: [],
      iGuessed: dto.players.some((player) => player.playerId === mine && player.guessed),
    }));
  };

  return {
    ...initialState,

    bind: () => {
      if (bound) return;
      bound = true;

      socket.on('turn:start', (dto) =>
        set((state) => ({
          turn: toTurnViewModel(dto),
          ops: dto.canvas,
          generation: state.generation + 1,
          // The drawing phase arrives as a second turn:start; the choices are spent.
          choices: dto.startedAt === 0 ? state.choices : null,
          feed: dto.startedAt === 0 ? [] : state.feed,
          iGuessed: false,
        })),
      );

      socket.on('turn:choices', (payload) => set({ choices: payload }));

      socket.on('turn:hint', ({ masked }) =>
        set((state) => (state.turn ? { turn: { ...state.turn, masked } } : {})),
      );

      socket.on('turn:end', ({ word }) => {
        pushFeed({ kind: 'word', playerId: null, text: word });
        set({ choices: null });
      });

      socket.on('player:guessed', ({ playerId, position, points }) => {
        pushFeed({ kind: 'guessed', playerId, text: String(position) });
        set((state) => ({
          iGuessed: state.iGuessed || playerId === myId(),
          turn: state.turn
            ? {
                ...state.turn,
                players: state.turn.players.map((player) =>
                  player.playerId === playerId
                    ? { ...player, guessed: true, position, points }
                    : player,
                ),
              }
            : null,
        }));
      });

      socket.on('chat:message', ({ playerId, text }) =>
        pushFeed({ kind: 'chat', playerId, text }),
      );

      // The drawer applied every one of these locally before sending them; the
      // broadcast comes back to them too, and replaying it would double the line.
      socket.on('draw:stroke', (payload) => {
        if (isMyEcho()) return;
        set((state) => ({ ops: appendOp(state.ops, { kind: 'stroke', ...payload }) }));
      });
      socket.on('draw:fill', (payload) => {
        if (isMyEcho()) return;
        set((state) => ({
          ops: appendOp(state.ops, { kind: 'fill', id: state.ops.length, ...payload }),
        }));
      });
      socket.on('draw:undo', () => {
        if (isMyEcho()) return;
        get().undoLocal();
      });
      socket.on('draw:clear', () => {
        if (isMyEcho()) return;
        get().clearLocal();
      });

      const current = useSessionStore.getState().snapshot;
      if (current) hydrate(current);
      useSessionStore.subscribe((state, previous) => {
        if (state.snapshot && state.snapshot !== previous.snapshot) hydrate(state.snapshot);
        if (!state.session && previous.session) set(initialState);
      });
    },

    pushLocalOp: (op) => set((state) => ({ ops: appendOp(state.ops, op) })),

    undoLocal: () =>
      set((state) => ({ ops: state.ops.slice(0, -1), generation: state.generation + 1 })),

    clearLocal: () =>
      set((state) => ({
        ops: [{ kind: 'clear', id: state.ops.length }],
        generation: state.generation + 1,
      })),

    clearChoices: () => set({ choices: null }),

    note: pushFeed,

    reset: () => set(initialState),
  };
});
