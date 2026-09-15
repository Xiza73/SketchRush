import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

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
    };
    return super.createIOServer(port, merged);
  }
}
