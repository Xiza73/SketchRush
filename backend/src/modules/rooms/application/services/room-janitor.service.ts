import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import { Room } from '../../domain/entities/room.entity';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';
import { ROOM_LIFECYCLE } from '../../domain/room-lifecycle';

/**
 * Periodic cleanup of stale players and rooms. Pure housekeeping, no rules;
 * the delays live in `ROOM_LIFECYCLE`.
 */
@Injectable()
export class RoomJanitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoomJanitorService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.safeSweep(), ROOM_LIFECYCLE.janitorIntervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private safeSweep(): void {
    try {
      this.sweep(this.clock.now());
    } catch (error: unknown) {
      this.logger.error('Janitor sweep failed', error instanceof Error ? error.stack : error);
    }
  }

  sweep(now: number): void {
    for (const room of this.rooms.all()) {
      if (room.status === 'lobby') this.removeStaleLobbyPlayers(room, now);

      const finishedTooLong =
        room.status === 'finished' &&
        room.finishedAt !== null &&
        now - room.finishedAt > ROOM_LIFECYCLE.finishedTtlMs;
      const abandonedAt = room.lastDisconnectionAt();
      const abandonedTooLong =
        abandonedAt !== null && now - abandonedAt > ROOM_LIFECYCLE.abandonedTtlMs;

      if (finishedTooLong || abandonedTooLong) {
        this.rooms.delete(room.code);
        this.logger.log(
          `Room ${room.code} deleted by janitor (${finishedTooLong ? 'finished' : 'abandoned'})`,
        );
      }
    }
  }

  /**
   * A player who stays disconnected in the lobby loses their slot. If that
   * empties the room, the abandonment clock keeps running from the moment
   * they dropped, so the empty room is deleted on the same schedule.
   */
  private removeStaleLobbyPlayers(room: Room, now: number): void {
    const stale = room.players.filter(
      (p) =>
        !p.connected &&
        p.disconnectedAt !== null &&
        now - p.disconnectedAt > ROOM_LIFECYCLE.lobbyDisconnectGraceMs,
    );
    if (stale.length === 0) return;

    const lastDropAt = Math.max(...stale.map((p) => p.disconnectedAt ?? now));
    for (const p of stale) room.removePlayer(p.id);
    if (room.isEmpty()) {
      room.emptiedAt = lastDropAt;
      return;
    }
    this.bus.publish({ roomCode: room.code, event: 'lobby:update', payload: room.toLobbyState() });
  }
}
