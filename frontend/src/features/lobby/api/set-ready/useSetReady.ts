import { useCallback } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { EmptyOk, Result } from '@/shared/lib/result';

export const useSetReady = () => {
  const setReady = useCallback(
    (ready: boolean): Promise<Result<EmptyOk>> =>
      request<EmptyOk>((ack) => socket.emit('room:ready', { ready }, ack)),
    [],
  );
  return { setReady };
};
