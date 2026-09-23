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
  // A room outlives any outage: keep trying for as long as the tab is open
  // (docs/context/02-game-rules.md -> "Being disconnected is not leaving").
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4_000,
});

export const ensureConnected = () => {
  if (!socket.connected) socket.connect();
};

/**
 * A phone that was locked, a laptop that slept or a network that came back:
 * socket.io's own backoff may still be waiting, so coming into view or back
 * online reconnects at once. `rejoin()` runs on `connect` as always, so this
 * adds no logic of its own.
 */
declare global {
  interface Window {
    /** Dev only: the socket itself, so a verification run can drop the line. */
    __sketchrushSocket?: AppSocket;
  }
}

if (typeof window !== 'undefined') {
  if (import.meta.env.DEV) window.__sketchrushSocket = socket;
  const wakeUp = () => {
    if (!socket.connected) socket.connect();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') wakeUp();
  });
  window.addEventListener('online', wakeUp);
}

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
        // Everything but the `ok` flag: a refusal may carry more than the code,
        // and the caller is the one who knows what to do with it.
        const { ok: _fail, ...error } = response;
        resolve(fail(error));
      }
    });
  });
