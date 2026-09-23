import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, EmptyAck, ServerToClientEvents } from '@shared/contract';

/** The seat a socket held, kept so a recovered socket can take it back. */
export interface SocketSeat {
  roomCode: string;
  playerId: string;
}

/** What the gateway remembers about a connected socket. */
export interface SocketData {
  roomCode?: string;
  playerId?: string;
  /**
   * The seat this socket had when it dropped. Socket.IO persists `data` for
   * the recovery window and hands the very same object to the socket that
   * comes back, so this is how `handleConnection` knows whom it is looking at.
   * Only set for a socket that lost its connection; leaving or being displaced
   * by another tab clears the seat for good.
   */
  lastSeat?: SocketSeat;
}

export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;
export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

export type { EmptyAck };

/** Empty success ack for events that return no data. */
export const OK_EMPTY: EmptyAck = { ok: true };

export function roomChannel(roomCode: string): string {
  return `room:${roomCode}`;
}
