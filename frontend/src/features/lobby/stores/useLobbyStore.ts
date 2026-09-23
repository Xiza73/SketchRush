import { create } from 'zustand';

import { socket } from '@/core/session/lib/socket';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { playSound } from '@/shared/lib/sound';

import { toLobbyViewModel, type LobbyViewModel } from '../models/lobby.model';

interface LobbyState {
  lobby: LobbyViewModel | null;
}

interface LobbyActions {
  bind: () => void;
  reset: () => void;
}

let bound = false;

const myId = () => useSessionStore.getState().session?.playerId ?? null;

export const useLobbyStore = create<LobbyState & LobbyActions>((set, get) => ({
  lobby: null,

  bind: () => {
    if (bound) return;
    bound = true;

    socket.on('lobby:update', (dto) => {
      // The roster is the only place that knows somebody arrived or left: the
      // server sends the whole lobby, not a delta, so the delta is taken here.
      const before = get().lobby?.players.length;
      if (before !== undefined && dto.players.length !== before) {
        playSound(dto.players.length > before ? 'playerJoined' : 'playerLeft');
      }
      set({ lobby: toLobbyViewModel(dto, myId()) });
    });
    // The lobby may not receive a lobby:update when the game starts; flip the status locally.
    socket.on('turn:start', () =>
      set((state) => (state.lobby ? { lobby: { ...state.lobby, status: 'drawing' } } : {})),
    );

    const hydrate = (
      snapshot: NonNullable<ReturnType<typeof useSessionStore.getState>['snapshot']>,
    ) => set({ lobby: toLobbyViewModel(snapshot.lobby, myId()) });

    const current = useSessionStore.getState().snapshot;
    if (current) hydrate(current);
    useSessionStore.subscribe((state, previous) => {
      if (state.snapshot && state.snapshot !== previous.snapshot) hydrate(state.snapshot);
      if (!state.session && previous.session) set({ lobby: null });
    });
  },

  reset: () => set({ lobby: null }),
}));

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
