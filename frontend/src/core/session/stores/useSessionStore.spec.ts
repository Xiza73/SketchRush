import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fail, ok } from '@/shared/lib/result';

import type * as StoreModule from './useSessionStore';

/**
 * The test environment is `node` — this project runs vitest with no config at
 * all, and no jsdom. The store only ever touches storage through two guarded
 * helpers, so a four-method stand-in is the whole dependency.
 */
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
});

/**
 * The store is exercised through its own `rejoin`, with the socket adapter and
 * the toaster replaced. What is under test is the decision the store makes
 * about a stored session when the server answers — or does not.
 */
const rejoinRoom = vi.fn();
vi.mock('@/core/session/api/rejoin-room/rejoinRoom', () => ({
  rejoinRoom: (...args: unknown[]) => rejoinRoom(...args),
}));
vi.mock('@/core/session/api/leave-room/leaveRoom', () => ({ leaveRoom: vi.fn() }));
vi.mock('@/core/session/lib/socket', () => ({
  socket: { on: vi.fn(), emit: vi.fn(), connected: true },
  ensureConnected: vi.fn(),
}));
vi.mock('@/core/session/lib/serverClock', () => ({ syncServerClock: vi.fn() }));
vi.mock('@/shared/stores/useToastStore', () => ({ toast: { error: vi.fn() } }));



const SESSION = { roomCode: 'ABCD', playerId: 'ana', token: 'tok', name: 'Ana' };

const snapshot = () => ({
  session: SESSION,
  state: { lobby: { status: 'lobby' } },
});

/**
 * A fresh module per test. The retry budget and its pending timer are
 * module-level — deliberately, there is one socket — so a leftover timer from
 * the previous test would block the next one's retry.
 */
let useSessionStore: typeof StoreModule.useSessionStore;

describe('useSessionStore · rejoin', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    rejoinRoom.mockReset();
    localStorage.clear();
    vi.resetModules();
    ({ useSessionStore } = await import('./useSessionStore'));
    useSessionStore.setState({ session: SESSION, connection: 'connected', expired: false });
  });

  it('keeps the session when the server never answers', async () => {
    // The seat was never refused. It was not mentioned at all, and throwing it
    // away here is how a player is put out of a game they are still in.
    rejoinRoom.mockResolvedValue(fail({ code: 'internal', message: 'timeout' }));

    await useSessionStore.getState().rejoin();

    expect(useSessionStore.getState().session).toEqual(SESSION);
    expect(useSessionStore.getState().expired).toBe(false);
    expect(useSessionStore.getState().connection).toBe('disconnected');
  });

  it('tries again after a timeout, and recovers when the answer arrives', async () => {
    rejoinRoom.mockResolvedValueOnce(fail({ code: 'internal', message: 'timeout' }));
    await useSessionStore.getState().rejoin();
    expect(rejoinRoom).toHaveBeenCalledTimes(1);

    rejoinRoom.mockResolvedValue(ok(snapshot()));
    await vi.advanceTimersByTimeAsync(1_500);

    expect(rejoinRoom).toHaveBeenCalledTimes(2);
    expect(useSessionStore.getState().session).toEqual(SESSION);
  });

  it('gives up retrying rather than hammering a server that is not there', async () => {
    rejoinRoom.mockResolvedValue(fail({ code: 'internal', message: 'timeout' }));

    await useSessionStore.getState().rejoin();
    await vi.advanceTimersByTimeAsync(60_000);

    // One first attempt plus the bounded retries, and then it stops.
    expect(rejoinRoom.mock.calls.length).toBeLessThanOrEqual(5);
    // Still holding the seat: nothing here proved it was gone.
    expect(useSessionStore.getState().session).toEqual(SESSION);
  });

  it('drops the session when the server says the room is gone', async () => {
    rejoinRoom.mockResolvedValue(fail({ code: 'room_not_found', message: 'gone' }));

    await useSessionStore.getState().rejoin();

    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().expired).toBe(true);
  });

  it('drops the session when the server says it expired', async () => {
    rejoinRoom.mockResolvedValue(fail({ code: 'session_expired', message: 'gone' }));

    await useSessionStore.getState().rejoin();

    expect(useSessionStore.getState().session).toBeNull();
  });
});
