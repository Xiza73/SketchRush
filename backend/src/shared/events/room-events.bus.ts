import { Injectable } from '@nestjs/common';
import type { ServerToClientEvents } from '@shared/contract';

/**
 * One server -> client event addressed to a room (or to a single player in it).
 * Use cases publish these; the socket gateway is the only subscriber and turns
 * them into Socket.IO emits. This keeps the application layer free of sockets.
 */
export type OutboundEvent = {
  [K in keyof ServerToClientEvents]: {
    event: K;
    payload: Parameters<ServerToClientEvents[K]>[0];
    roomCode: string;
    /** When set, deliver only to this player's socket instead of the whole room. */
    toPlayerId?: string;
  };
}[keyof ServerToClientEvents];

export type OutboundListener = (event: OutboundEvent) => void;

@Injectable()
export class RoomEventsBus {
  private readonly listeners = new Set<OutboundListener>();

  subscribe(listener: OutboundListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Synchronous fan-out: listeners run before `publish` returns. */
  publish(event: OutboundEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
