import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

/**
 * How long a socket may be gone and still come back as itself. Socket.IO keeps
 * the session (rooms, `socket.data`, missed packets) for this long; the gateway
 * re-seats the player on `client.recovered`.
 */
export const DISCONNECTION_RECOVERY_MS = 2 * 60_000;

/**
 * Heartbeat: the server pings every 20 s and waits 120 s for the pong.
 *
 * The defaults (25 s / 20 s) drop players who did nothing wrong. A browser
 * throttles timers in a background tab and a phone suspends them outright when
 * the screen goes off, so a pong can easily be two minutes late; with a 20 s
 * timeout the server closed the socket and, in the lobby, the player vanished.
 * Waiting two minutes costs a little memory on a socket that is really gone and
 * keeps the ones that are merely asleep. Reported by real users on WordRush,
 * 2026-09-17.
 */
export const HEARTBEAT = { pingInterval: 20_000, pingTimeout: 120_000 } as const;

/** Socket.IO adapter that applies the same CORS allowlist as the HTTP server. */
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly allowedOrigins: string[] | undefined,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const merged: Partial<ServerOptions> = {
      ...options,
      cors: { origin: this.allowedOrigins ?? true, credentials: true },
      transports: ['websocket', 'polling'],
      pingInterval: HEARTBEAT.pingInterval,
      pingTimeout: HEARTBEAT.pingTimeout,
      // A short drop restores the socket's rooms, its `data` and the events it
      // missed, so a tunnel that blinks does not cost the player their seat.
      // `skipMiddlewares` because there are none that a recovered socket needs.
      connectionStateRecovery: {
        maxDisconnectionDuration: DISCONNECTION_RECOVERY_MS,
        skipMiddlewares: true,
      },
    };
    return super.createIOServer(port, merged);
  }
}
