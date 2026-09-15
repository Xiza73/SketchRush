import { Injectable } from '@nestjs/common';
import type { GameSocket } from './socket.types';
import { roomChannel } from './socket.types';

/**
 * playerId -> live socket. A player has at most one socket: binding a new one
 * (rejoin after reload, or a second tab) detaches the previous one so its
 * later disconnect cannot mark the player offline. The displaced socket stays
 * connected but seatless and is told with `session:replaced`, so that tab can
 * show "open in another tab" and take the seat back by rejoining.
 */
@Injectable()
export class SessionRegistry {
  private readonly byPlayer = new Map<string, GameSocket>();

  bind(socket: GameSocket, roomCode: string, playerId: string): void {
    const previous = this.byPlayer.get(playerId);
    if (previous && previous.id !== socket.id) {
      this.detach(previous);
      previous.emit('session:replaced', { roomCode });
    }
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    void socket.join(roomChannel(roomCode));
    this.byPlayer.set(playerId, socket);
  }

  /** Forgets the socket's session; returns it so the caller can act on it. */
  detach(socket: GameSocket): { roomCode: string; playerId: string } | null {
    const { roomCode, playerId } = socket.data;
    if (roomCode) void socket.leave(roomChannel(roomCode));
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
    if (!roomCode || !playerId) return null;
    if (this.byPlayer.get(playerId)?.id === socket.id) this.byPlayer.delete(playerId);
    return { roomCode, playerId };
  }

  /** True when this socket is the one currently bound to its player. */
  isCurrent(socket: GameSocket): boolean {
    const playerId = socket.data.playerId;
    return playerId !== undefined && this.byPlayer.get(playerId)?.id === socket.id;
  }

  socketOf(playerId: string): GameSocket | undefined {
    return this.byPlayer.get(playerId);
  }
}
