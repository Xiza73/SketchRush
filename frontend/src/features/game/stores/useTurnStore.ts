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
  /**
   * What undo has taken off, newest last — the drawer's mirror of the stack the
   * server keeps. Drawing anything new empties it, exactly as it does there.
   */
  undone: DrawOp[];
}

interface TurnActions {
  bind: () => void;
  /** The drawer's own strokes: applied locally, then sent. */
  pushLocalOp: (op: DrawOp) => void;
  undoLocal: () => void;
  /** Puts back what undo took, off this screen's own stack. */
  redoLocal: () => void;
  clearLocal: () => void;
  /** A watcher appending the operation the server just restored. */
  appendRestored: (op: DrawOp) => void;
  clearChoices: () => void;
  /** Writes my own attempt into my own feed. Never sent anywhere. */
  noteMyGuess: (text: string, verdict: 'correct' | 'close' | 'wrong') => void;
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
  undone: [],
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

      // Addressed to the drawer and nobody else; the server only sends it in a
      // `box` room, where it is the drawer's one window onto whether the
      // drawing is working at all.
      socket.on('guess:attempt', ({ playerId, close }) =>
        pushFeed({ kind: 'attempt', playerId, text: '', verdict: close ? 'close' : 'wrong' }),
      );

      socket.on('chat:message', ({ playerId, text }) => {
        // My own message comes back to me too, and I already wrote it down with
        // its verdict the moment I sent it. Keeping both would say it twice.
        if (playerId === myId()) return;
        pushFeed({ kind: 'chat', playerId, text });
      });

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
      socket.on('draw:redo', (op) => {
        if (isMyEcho()) return;
        get().appendRestored(op);
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

    // Drawing anything new ends the future undo was holding, here as on the
    // server. The two stacks have to agree or redo puts back a different line
    // on the drawer's screen than on everybody else's.
    pushLocalOp: (op) =>
      set((state) => ({ ops: appendOp(state.ops, op), undone: [] })),

    undoLocal: () =>
      set((state) => {
        const dropped = state.ops[state.ops.length - 1];
        if (!dropped) return {};
        return {
          ops: state.ops.slice(0, -1),
          undone: [...state.undone, dropped],
          generation: state.generation + 1,
        };
      }),

    redoLocal: () =>
      set((state) => {
        const restored = state.undone[state.undone.length - 1];
        if (!restored) return {};
        // No generation bump: putting an operation back on the end *is* an
        // extension of what is already painted, which is exactly the case this
        // counter exists not to repaint. The undo before it bumped, so the
        // painter is already at the end of what it has.
        return { ops: [...state.ops, restored], undone: state.undone.slice(0, -1) };
      }),

    // A clear covers the drawing rather than deleting it, so undo can take the
    // clear back. The painter reads the marker as "paint over all of this".
    clearLocal: () =>
      set((state) => ({
        ops: [...state.ops, { kind: 'clear', id: state.ops.length }],
        undone: [],
        generation: state.generation + 1,
      })),

    appendRestored: (op) => set((state) => ({ ops: [...state.ops, op] })),

    clearChoices: () => set({ choices: null }),

    noteMyGuess: (text, verdict) => pushFeed({ kind: 'mine', playerId: myId(), text, verdict }),

    reset: () => set(initialState),
  };
});

/*
 * Not hot-swappable, on purpose. Development only — `import.meta.hot` is
 * undefined in a build, so none of this ships.
 *
 * This module owns socket subscriptions and a module-level "bound" latch. React
 * Fast Refresh keeps the mounted tree but re-evaluates this file, so a hot
 * update leaves the screen reading a new, unbound store while the old one still
 * holds the listeners: writes land in one instance and the UI reads the other.
 * The screen then stops reacting to the room and nothing errors.
 *
 * `invalidate()` is not enough — it propagates to the importers, and those are
 * components that Fast Refresh happily accepts, so it never escalates. The
 * reload has to be asked for outright.
 */
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
