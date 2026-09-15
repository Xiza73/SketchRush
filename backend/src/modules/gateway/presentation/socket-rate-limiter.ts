import { Injectable } from '@nestjs/common';

export interface RateLimit {
  /** Maximum calls allowed inside one window. */
  max: number;
  windowMs: number;
}

/**
 * Minimal per-socket, per-event sliding-window throttle for the chatty
 * events. Game rules (the emote burst limit, for one) live in their use case,
 * keyed by player; this only stops a misbehaving client from flooding the
 * process.
 */
@Injectable()
export class SocketRateLimiter {
  private readonly calls = new Map<string, number[]>();

  /** Returns true when the call is allowed and records it. */
  allow(socketId: string, event: string, limit: RateLimit, now = Date.now()): boolean {
    const key = `${socketId}:${event}`;
    const recent = (this.calls.get(key) ?? []).filter((t) => now - t < limit.windowMs);
    if (recent.length >= limit.max) {
      this.calls.set(key, recent);
      return false;
    }
    recent.push(now);
    this.calls.set(key, recent);
    return true;
  }

  forget(socketId: string): void {
    for (const key of this.calls.keys()) {
      if (key.startsWith(`${socketId}:`)) this.calls.delete(key);
    }
  }
}
