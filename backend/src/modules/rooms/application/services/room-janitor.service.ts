import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/interfaces/room-repository.interface';
import { ROOM_LIFECYCLE } from '../../domain/room-lifecycle';

/**
 * Periodic cleanup of rooms nobody is in. Pure housekeeping, no rules; the
 * delays live in `ROOM_LIFECYCLE`.
 *
 * It never removes a player. Being disconnected is not leaving (decided
 * 2026-09-22): the seat is held for as long as the room lives, so somebody who
 * switched apps or walked into a lift finds their place where they left it.
 */
@Injectable()
export class RoomJanitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoomJanitorService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
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
}
