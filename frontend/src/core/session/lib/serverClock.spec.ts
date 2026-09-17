import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Ack, TimeSyncAck } from '@/shared/contract';

/**
 * The socket is replaced wholesale: these tests are about the arithmetic that
 * turns a round trip into an offset, and a real connection would only add noise
 * to the one number under test.
 */
const emit = vi.fn();
vi.mock('./socket', () => ({ socket: { emit: (...args: unknown[]) => emit(...args) } }));

const { syncServerClock, serverNow, clockOffset } = await import('./serverClock');

/**
 * Answers a `time:sync` as a server `serverAhead` ms ahead of this machine
 * would, after `tripMs` of round trip split evenly between the two legs.
 */
const server = (serverAhead: number, tripMs: number) => {
  emit.mockImplementation((_event: string, ack: (r: Ack<TimeSyncAck>) => void) => {
    vi.advanceTimersByTime(tripMs / 2);
    const now = Date.now() + serverAhead;
    vi.advanceTimersByTime(tripMs / 2);
    ack({ ok: true, now });
  });
};

describe('serverClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
    emit.mockReset();
  });

  it('finds a server running ahead of this machine', async () => {
    server(4500, 200);
    await syncServerClock();
    // The measured offset should land on the real skew, not on the round trip.
    expect(clockOffset()).toBeCloseTo(4500, -1);
    expect(serverNow() - Date.now()).toBeCloseTo(4500, -1);
  });

  it('finds a server running behind it', async () => {
    server(-3000, 120);
    await syncServerClock();
    expect(clockOffset()).toBeCloseTo(-3000, -1);
  });

  it('reports no offset when the clocks already agree', async () => {
    server(0, 300);
    await syncServerClock();
    // A 300 ms round trip must not be mistaken for 300 ms of skew.
    expect(clockOffset()).toBeCloseTo(0, -1);
  });

  it('falls back to this machine when the server never answers', async () => {
    emit.mockImplementation(() => {
      /* dropped on the floor */
    });
    const sync = syncServerClock();
    await vi.advanceTimersByTimeAsync(20_000);
    await sync;
    // Silence must not shift the clock: an unsynced game is still a game.
    expect(clockOffset()).toBe(0);
  });

  it('falls back when the server answers with a refusal', async () => {
    emit.mockImplementation((_event: string, ack: (r: Ack<TimeSyncAck>) => void) =>
      ack({ ok: false, code: 'internal', message: 'nope' }),
    );
    await syncServerClock();
    expect(clockOffset()).toBe(0);
  });
});
