import { request, socket } from '@/core/session/lib/socket';
import type { StoredSession } from '@/core/session/models/session.model';
import type { Result } from '@/shared/lib/result';

import { toRejoinRequest, type RejoinRoomResponse } from './rejoin-room.dto';

/** Plain function (not a hook) so the store can call it on reconnect. */
export const rejoinRoom = (session: StoredSession): Promise<Result<RejoinRoomResponse>> =>
  request<RejoinRoomResponse>((ack) => socket.emit('room:rejoin', toRejoinRequest(session), ack));
