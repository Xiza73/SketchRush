import { SessionRegistry } from './session-registry';
import type { GameSocket } from './socket.types';

interface FakeSocket extends GameSocket {
  emitted: { event: string; payload: unknown }[];
  joined: string[];
  levt: string[];
}

const fakeSocket = (id: string): FakeSocket => {
  const socket = {
    id,
    data: {},
    emitted: [] as { event: string; payload: unknown }[],
    joined: [] as string[],
    levt: [] as string[],
    emit(event: string, payload: unknown) {
      socket.emitted.push({ event, payload });
      return true;
    },
    join(room: string) {
      socket.joined.push(room);
    },
    leave(room: string) {
      socket.levt.push(room);
    },
    disconnect() {
      return socket;
    },
  };
  return socket as unknown as FakeSocket;
};

describe('SessionRegistry', () => {
  let registry: SessionRegistry;

  beforeEach(() => {
    registry = new SessionRegistry();
  });

  it('binds a socket to its player and room channel', () => {
    const socket = fakeSocket('s1');
    registry.bind(socket, 'ABCD', 'p1');

    expect(socket.data).toEqual({ roomCode: 'ABCD', playerId: 'p1' });
    expect(socket.joined).toEqual(['room:ABCD']);
    expect(registry.socketOf('p1')).toBe(socket);
    expect(registry.isCurrent(socket)).toBe(true);
  });

  it('hands the seat to the newest socket and tells the old one it was replaced', () => {
    const first = fakeSocket('s1');
    const second = fakeSocket('s2');
    registry.bind(first, 'ABCD', 'p1');

    registry.bind(second, 'ABCD', 'p1');

    expect(first.emitted).toEqual([{ event: 'session:replaced', payload: { roomCode: 'ABCD' } }]);
    expect(first.data).toEqual({ roomCode: undefined, playerId: undefined });
    expect(first.levt).toEqual(['room:ABCD']);
    expect(registry.isCurrent(first)).toBe(false);
    expect(registry.socketOf('p1')).toBe(second);
    expect(registry.isCurrent(second)).toBe(true);
  });

  it('lets the displaced tab take the seat back', () => {
    const first = fakeSocket('s1');
    const second = fakeSocket('s2');
    registry.bind(first, 'ABCD', 'p1');
    registry.bind(second, 'ABCD', 'p1');

    registry.bind(first, 'ABCD', 'p1');

    expect(second.emitted).toEqual([{ event: 'session:replaced', payload: { roomCode: 'ABCD' } }]);
    expect(registry.socketOf('p1')).toBe(first);
  });

  it('does not announce a replacement when the same socket rebinds', () => {
    const socket = fakeSocket('s1');
    registry.bind(socket, 'ABCD', 'p1');

    registry.bind(socket, 'ABCD', 'p1');

    expect(socket.emitted).toEqual([]);
    expect(registry.socketOf('p1')).toBe(socket);
  });

  it('detach returns the session once and forgets the socket', () => {
    const socket = fakeSocket('s1');
    registry.bind(socket, 'ABCD', 'p1');

    expect(registry.detach(socket)).toEqual({ roomCode: 'ABCD', playerId: 'p1' });
    expect(registry.detach(socket)).toBeNull();
    expect(registry.socketOf('p1')).toBeUndefined();
  });

  it('a stale socket detaching does not steal the current binding', () => {
    const first = fakeSocket('s1');
    const second = fakeSocket('s2');
    registry.bind(first, 'ABCD', 'p1');
    registry.bind(second, 'ABCD', 'p1');

    registry.detach(first);

    expect(registry.socketOf('p1')).toBe(second);
  });
});
