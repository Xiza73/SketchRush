import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { TickTurnsUseCase } from '../use-cases/tick-turns.use-case';

/** How often the game loop runs. */
export const TICK_INTERVAL_MS = 250;

/**
 * The single clock behind every room in the process.
 *
 * One interval, not one per room: a hundred rooms are a hundred `setInterval`
 * handles to leak and a hundred chances to forget a `clearInterval`. The work
 * itself — and the error handling that keeps one bad room from poisoning the
 * rest — is `TickTurnsUseCase`'s.
 */
@Injectable()
export class TurnTickerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tick: TickTurnsUseCase,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.tick.execute(this.clock.now()), TICK_INTERVAL_MS);
    // Nothing here should hold the process open on its own.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
