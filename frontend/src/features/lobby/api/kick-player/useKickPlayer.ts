import { useCallback, useState } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { EmptyOk, Result } from '@/shared/lib/result';

/** Host only: throws a player or observer out; the room redraws from `lobby:update`. */
export const useKickPlayer = () => {
  const [pending, setPending] = useState(false);

  const kick = useCallback(async (playerId: string): Promise<Result<EmptyOk>> => {
    setPending(true);
    try {
      return await request<EmptyOk>((ack) => socket.emit('room:kick', { playerId }, ack));
    } finally {
      setPending(false);
    }
  }, []);

  return { kick, pending };
};
