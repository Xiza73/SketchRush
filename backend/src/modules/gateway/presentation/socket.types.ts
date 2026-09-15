import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, EmptyAck, ServerToClientEvents } from '@shared/contract';

/** What the gateway remembers about a connected socket. */
export interface SocketData {
  roomCode?: string;
  playerId?: string;
}

export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;
export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

export type { EmptyAck };

/** Empty success ack for events that return no data. */
export const OK_EMPTY: EmptyAck = { ok: true };

export function roomChannel(roomCode: string): string {
  return `room:${roomCode}`;
}
