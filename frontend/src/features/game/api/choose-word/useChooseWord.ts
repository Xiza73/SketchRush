import { useCallback, useState } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { EmptyOk, Result } from '@/shared/lib/result';

import { useTurnStore } from '../../stores/useTurnStore';

export const useChooseWord = () => {
  const [pending, setPending] = useState(false);

  const chooseWord = useCallback(async (index: number): Promise<Result<EmptyOk>> => {
    setPending(true);
    // Closed here rather than on the ack: the picker must go away the moment it
    // is used, and the turn:start that follows would close it either way.
    useTurnStore.getState().clearChoices();
    try {
      return await request<EmptyOk>((ack) => socket.emit('turn:choose', { index }, ack));
    } finally {
      setPending(false);
    }
  }, []);

  return { chooseWord, pending };
};
