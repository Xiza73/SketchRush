import { useCallback, useState } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { EmptyOk, Result } from '@/shared/lib/result';

export const useStartGame = () => {
  const [pending, setPending] = useState(false);

  const startGame = useCallback(async (): Promise<Result<EmptyOk>> => {
    setPending(true);
    try {
      return await request<EmptyOk>((ack) => socket.emit('room:start', ack));
    } finally {
      setPending(false);
    }
  }, []);

  return { startGame, pending };
};
