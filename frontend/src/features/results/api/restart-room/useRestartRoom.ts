import { useCallback, useState } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { EmptyOk, Result } from '@/shared/lib/result';

/**
 * "Jugar de nuevo": host-only, finished-game only. The room keeps its code,
 * its players and its rules; the server answers with a `lobby:update` in
 * `lobby` status that moves everybody to the waiting room.
 */
export const useRestartRoom = () => {
  const [pending, setPending] = useState(false);

  const restartRoom = useCallback(async (): Promise<Result<EmptyOk>> => {
    setPending(true);
    try {
      return await request<EmptyOk>((ack) => socket.emit('room:restart', ack));
    } finally {
      setPending(false);
    }
  }, []);

  return { restartRoom, pending };
};
