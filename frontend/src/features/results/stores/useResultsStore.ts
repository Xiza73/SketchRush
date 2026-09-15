import { create } from 'zustand';

import { socket } from '@/core/session/lib/socket';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import type {
  FullState,
  GameEndPayload,
  LobbyState,
  RoomStatus,
  TurnEndPayload,
} from '@/shared/contract';

interface ResultsState {
  roundEnd: TurnEndPayload | null;
  gameEnd: GameEndPayload | null;
  /** Epoch ms when the next round starts; null when unknown or the game ended. */
  nextRoundAt: number | null;
  /** Round number of the latest `round:start`; > roundEnd.turn means play resumed. */
  latestRoundStarted: number | null;
  /**
   * Latest room status, tracked from every lifecycle event and not only from
   * `lobby:update` (the server sends none when a round starts or the game
   * ends). Back to `lobby` can then only mean one thing: the host restarted
   * the room.
   */
  roomStatus: RoomStatus | null;
  /** Who may press "play again"; it can change if the host leaves the results. */
  hostId: string | null;
}

interface ResultsActions {
  bind: () => void;
  reset: () => void;
}

let bound = false;

const initialState: ResultsState = {
  roundEnd: null,
  gameEnd: null,
  nextRoundAt: null,
  latestRoundStarted: null,
  roomStatus: null,
  hostId: null,
};

const fromLobby = (lobby: LobbyState) => ({
  roomStatus: lobby.status,
  hostId: lobby.players.find((player) => player.isHost)?.id ?? null,
});

export const useResultsStore = create<ResultsState & ResultsActions>((set) => {
  const hydrate = (snapshot: FullState) => {
    const roundEnd = snapshot.lastTurnEnd;
    const finished = snapshot.lobby.status === 'finished';
    set({
      roundEnd,
      gameEnd:
        finished && roundEnd
          ? { standings: roundEnd.standings, rounds: roundEnd.totalTurns }
          : null,
      // The snapshot's nextTurnIn was computed when the round ended; it is only an estimate here.
      nextRoundAt:
        roundEnd && !finished && roundEnd.nextTurnIn > 0
          ? Date.now() + roundEnd.nextTurnIn * 1000
          : null,
      latestRoundStarted: snapshot.turn?.turn ?? null,
      ...fromLobby(snapshot.lobby),
    });
  };

  return {
    ...initialState,

    bind: () => {
      if (bound) return;
      bound = true;

      socket.on('turn:end', (payload) =>
        set({
          roundEnd: payload,
          gameEnd: null,
          nextRoundAt: payload.nextTurnIn > 0 ? Date.now() + payload.nextTurnIn * 1000 : null,
          roomStatus: payload.nextTurnIn > 0 ? 'between-turns' : 'finished',
        }),
      );
      socket.on('game:end', (payload) =>
        set({ gameEnd: payload, nextRoundAt: null, roomStatus: 'finished' }),
      );
      socket.on('turn:start', (round) =>
        set({ latestRoundStarted: round.turn, roomStatus: 'drawing' }),
      );
      // Carries the restart ("play again" turns the room back into a lobby) and
      // any change of host while the results are on screen.
      socket.on('lobby:update', (lobby) => set(fromLobby(lobby)));

      const current = useSessionStore.getState().snapshot;
      if (current) hydrate(current);
      useSessionStore.subscribe((state, previous) => {
        if (state.snapshot && state.snapshot !== previous.snapshot) hydrate(state.snapshot);
        if (!state.session && previous.session) set(initialState);
      });
    },

    reset: () => set(initialState),
  };
});
