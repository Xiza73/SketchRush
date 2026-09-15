import { request, socket } from '@/core/session/lib/socket';
import type { EmptyOk } from '@/shared/lib/result';

/**
 * Gives up the seat for good. Plain function (not a hook) so the session store
 * can call it; the ack is short-lived because the caller leaves either way.
 */
export const leaveRoom = async (): Promise<void> => {
  if (!socket.connected) return;
  await request<EmptyOk>((ack) => socket.emit('room:leave', ack), 3_000);
};
