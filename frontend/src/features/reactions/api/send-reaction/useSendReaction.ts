import { useCallback } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { Emote } from '@/shared/contract';
import type { EmptyOk } from '@/shared/lib/result';
import { toast } from '@/shared/stores/useToastStore';

import { useReactionsStore } from '../../stores/useReactionsStore';

export const useSendReaction = () => {
  /**
   * Fire and forget as far as the caller is concerned: the sticker the sender
   * sees is the one the server broadcast back, so there is nothing to show
   * optimistically and nothing to undo.
   */
  const sendReaction = useCallback(async (emote: Emote): Promise<void> => {
    const result = await request<EmptyOk>((ack) => socket.emit('reaction:send', { emote }, ack));
    if (result.ok) return;
    // A flood pause is expected behaviour, not an error worth a toast: the
    // button itself says so for as long as it lasts.
    if (result.error.code === 'cooldown') useReactionsStore.getState().pause();
    else toast.error(result.error.code);
  }, []);

  return { sendReaction };
};
