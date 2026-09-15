import type { RejoinPayload, SessionAck } from '@/shared/contract';
import type { StoredSession } from '@/core/session/models/session.model';

export type RejoinRoomRequest = RejoinPayload;
export type RejoinRoomResponse = SessionAck;

export const toRejoinRequest = (session: StoredSession): RejoinRoomRequest => ({
  roomCode: session.roomCode,
  playerId: session.playerId,
  token: session.token,
});
