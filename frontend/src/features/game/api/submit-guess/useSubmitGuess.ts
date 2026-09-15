import { useCallback, useState } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { GuessAck } from '@/shared/contract';
import type { Result } from '@/shared/lib/result';

export const useSubmitGuess = () => {
  const [pending, setPending] = useState(false);

  /**
   * Everything the guesser learns is in this ack and nowhere else: the room is
   * told *that* somebody got it, never what anybody typed.
   */
  const submitGuess = useCallback(async (text: string): Promise<Result<GuessAck>> => {
    setPending(true);
    try {
      return await request<GuessAck>((ack) => socket.emit('game:guess', { text }, ack));
    } finally {
      setPending(false);
    }
  }, []);

  return { submitGuess, pending };
};
