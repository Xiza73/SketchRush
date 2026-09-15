import { io, type Socket } from 'socket.io-client';

import type { Ack, ClientToServerEvents, ServerToClientEvents } from '@/shared/contract';
import { fail, ok, type Result } from '@/shared/lib/result';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim() || window.location.origin;
const ACK_TIMEOUT_MS = 10_000;

/** The single socket for the whole app. Only `api/` folders and stores import it. */
export const socket: AppSocket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4_000,
});

export const ensureConnected = () => {
  if (!socket.connected) socket.connect();
};

/**
 * Wraps an emit-with-ack into a promise of `Result`. Resolves with an
 * `internal` error carrying the `timeout` message when the server stays silent.
 */
export const request = <T>(
  emit: (ack: (response: Ack<T>) => void) => void,
  timeoutMs = ACK_TIMEOUT_MS,
): Promise<Result<T>> =>
  new Promise((resolve) => {
    ensureConnected();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fail({ code: 'internal', message: 'timeout' }));
    }, timeoutMs);

    emit((response) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (response.ok) {
        const { ok: _ok, ...value } = response;
        resolve(ok(value as T));
      } else {
        resolve(fail({ code: response.code, message: response.message }));
      }
    });
  });
