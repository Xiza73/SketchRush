import { useCallback, useState } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { fail, type Result } from '@/shared/lib/result';

import { toJoinRoomRequest, type JoinRoomResponse } from './join-room.dto';

export const useJoinRoom = () => {
  const [pending, setPending] = useState(false);

  const joinRoom = useCallback(
    async (roomCode: string, name: string): Promise<Result<{ roomCode: string }>> => {
      // Safety net for "one game at a time": the UI never offers this with a
      // live session, and the server refuses it too (`already_in_room`).
      if (useSessionStore.getState().hasLiveSession()) {
        return fail({ code: 'already_in_room', message: 'already in a room' });
      }
      setPending(true);
      try {
        const result = await request<JoinRoomResponse>((ack) =>
          socket.emit('room:join', toJoinRoomRequest(roomCode, name), ack),
        );
        if (!result.ok) return result;
        useSessionStore.getState().applyAck(result.value, name.trim());
        return { ok: true, value: { roomCode: result.value.roomCode } };
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { joinRoom, pending };
};
