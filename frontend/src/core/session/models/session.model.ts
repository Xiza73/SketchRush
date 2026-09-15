import type { FullState, SessionAck } from '@/shared/contract';

/** What survives a reload: enough to `room:rejoin`. */
export interface StoredSession {
  roomCode: string;
  playerId: string;
  token: string;
  name: string;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export const toStoredSession = (ack: SessionAck, fallbackName: string): StoredSession => {
  const me = ack.state.lobby.players.find((player) => player.id === ack.playerId);
  return {
    roomCode: ack.roomCode,
    playerId: ack.playerId,
    token: ack.token,
    name: me?.name ?? fallbackName,
  };
};

export const statusOf = (state: FullState) => state.lobby.status;
