import type { JoinRoomPayload, SessionAck } from '@/shared/contract';

export type JoinRoomRequest = JoinRoomPayload;
export type JoinRoomResponse = SessionAck;

export const toJoinRoomRequest = (roomCode: string, name: string): JoinRoomRequest => ({
  roomCode: roomCode.trim().toUpperCase(),
  name: name.trim(),
});
