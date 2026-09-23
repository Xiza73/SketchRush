import { beforeEach, describe, expect, it, vi } from 'vitest';

import { blockFor, secondsLeftFor, useKickCooldownStore } from './useKickCooldown';

// The store stamps its deadline with the server clock, so the test drives that.
vi.mock('@/core/session/lib/serverClock', () => ({
  serverNow: () => serverNowValue,
}));

let serverNowValue = 0;
const T0 = 1_000_000;

describe('kick cooldown', () => {
  beforeEach(() => {
    serverNowValue = T0;
    useKickCooldownStore.getState().clear();
  });

  it('stamps the deadline with the server clock, not this machine’s', () => {
    // A browser 5 s ahead of the server: `Date.now()` would shorten the block.
    const localSkew = 5_000;
    vi.spyOn(Date, 'now').mockReturnValue(T0 + localSkew);

    useKickCooldownStore.getState().start('ABCD', 'Beto', 30);
    const block = useKickCooldownStore.getState().block!;

    expect(block.until).toBe(T0 + 30_000);
    expect(secondsLeftFor(block, serverNowValue)).toBe(30);
    vi.restoreAllMocks();
  });

  it('counts down and rounds up, so the last fraction reads 1 and never 0', () => {
    useKickCooldownStore.getState().start('ABCD', 'Beto', 30);
    const block = useKickCooldownStore.getState().block!;

    expect(secondsLeftFor(block, T0 + 18_000)).toBe(12);
    expect(secondsLeftFor(block, T0 + 29_100)).toBe(1);
    expect(secondsLeftFor(block, T0 + 30_000)).toBe(0);
    // Past the deadline never goes negative.
    expect(secondsLeftFor(block, T0 + 60_000)).toBe(0);
  });

  it('matches the room and name blind to case and spacing, and nothing else', () => {
    useKickCooldownStore.getState().start('abcd', '  Beto ', 30);
    const block = useKickCooldownStore.getState().block;

    expect(blockFor(block, 'ABCD', 'beto')).not.toBeNull();
    expect(blockFor(block, 'ABCD', 'BETO  ')).not.toBeNull();
    // A different name is a different player: the block is on the name alone.
    expect(blockFor(block, 'ABCD', 'Carla')).toBeNull();
    expect(blockFor(block, 'WXYZ', 'Beto')).toBeNull();
  });

  it('holds one block at a time, and a refusal restarts it from the server’s number', () => {
    useKickCooldownStore.getState().start('ABCD', 'Beto', 30);
    // The join is refused a moment later and the server says 12 s are left.
    serverNowValue = T0 + 18_000;
    useKickCooldownStore.getState().start('ABCD', 'Beto', 12);

    const block = useKickCooldownStore.getState().block!;
    expect(block.until).toBe(T0 + 30_000);
    expect(secondsLeftFor(block, serverNowValue)).toBe(12);
  });

  it('has no block once cleared', () => {
    useKickCooldownStore.getState().start('ABCD', 'Beto', 30);
    useKickCooldownStore.getState().clear();
    expect(secondsLeftFor(useKickCooldownStore.getState().block, T0)).toBe(0);
  });
});
