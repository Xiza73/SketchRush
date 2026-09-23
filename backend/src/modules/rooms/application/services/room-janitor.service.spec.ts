import { type Clock } from '@shared/domain/clock';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import { ROOM_LIFECYCLE } from '../../domain/room-lifecycle';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { RoomJanitorService } from './room-janitor.service';

const T0 = 1_000_000;
const MINUTE = 60_000;

class FakeClock implements Clock {
  current = T0;
  now(): number {
    return this.current;
  }
}

const settings = {
  language: 'es' as const,
  drawSeconds: 60,
  rounds: 3,
  capacity: 8,
  hints: true,
  guessMode: 'box' as const,
};

function makeRoom(code: string, ids: string[], now: number): Room {
  const room = Room.create(code, settings, now);
  ids.forEach((id, index) =>
    room.addPlayer(
      Player.create({ id, token: `t-${id}`, name: id, isHost: index === 0, joinedAt: now }),
    ),
  );
  return room;
}

describe('RoomJanitorService', () => {
  let rooms: InMemoryRoomRepository;
  let clock: FakeClock;
  let janitor: RoomJanitorService;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    clock = new FakeClock();
    janitor = new RoomJanitorService(rooms, clock);
  });

  it('never removes a disconnected lobby player: the seat is held', () => {
    const room = makeRoom('ABCD', ['a', 'b'], T0);
    room.findPlayer('b')!.markDisconnected(T0);
    rooms.save(room);

    // Somebody who took a call comes back to the room they were in, however
    // long it took (docs/context/02-game-rules.md -> "Being disconnected is
    // not leaving").
    janitor.sweep(T0 + 30 * MINUTE);
    expect(room.players.map((p) => p.id)).toEqual(['a', 'b']);
    expect(room.findPlayer('b')!.connected).toBe(false);
    expect(rooms.findByCode('ABCD')).toBe(room);
  });

  it('deletes a lobby nobody is connected to after an hour', () => {
    const room = makeRoom('WXYZ', ['a', 'b'], T0);
    room.findPlayer('a')!.markDisconnected(T0);
    room.findPlayer('b')!.markDisconnected(T0 + 5 * MINUTE);
    rooms.save(room);

    janitor.sweep(T0 + 59 * MINUTE);
    expect(rooms.findByCode('WXYZ')).toBe(room);

    // The clock runs from the *last* disconnection (T0 + 5 min).
    janitor.sweep(T0 + 65 * MINUTE + 1);
    expect(rooms.findByCode('WXYZ')).toBeUndefined();
  });

  it('never deletes a room while somebody is connected', () => {
    const room = makeRoom('LIVE', ['a', 'b'], T0);
    room.status = 'drawing';
    room.findPlayer('b')!.markDisconnected(T0);
    rooms.save(room);

    janitor.sweep(T0 + 120 * MINUTE);
    expect(rooms.findByCode('LIVE')).toBe(room);
    expect(room.players).toHaveLength(2);
  });

  it('deletes a finished room after 5 minutes', () => {
    const room = makeRoom('DONE', ['a'], T0);
    room.status = 'finished';
    room.finishedAt = T0;
    rooms.save(room);

    janitor.sweep(T0 + ROOM_LIFECYCLE.finishedTtlMs - 1);
    expect(rooms.findByCode('DONE')).toBe(room);

    janitor.sweep(T0 + ROOM_LIFECYCLE.finishedTtlMs + 1);
    expect(rooms.findByCode('DONE')).toBeUndefined();
  });

  it('never deletes a restarted room as "finished": it is a lobby again', () => {
    const room = makeRoom('AGAIN', ['a', 'b'], T0);
    room.status = 'finished';
    room.finishedAt = T0;
    rooms.save(room);

    // "Play again" at T0 + 1 min: the room goes back to the lobby it came from.
    room.resetForNewGame(T0 + MINUTE);

    janitor.sweep(T0 + ROOM_LIFECYCLE.finishedTtlMs + 1);
    expect(rooms.findByCode('AGAIN')).toBe(room);
    expect(room.players).toHaveLength(2);
  });

  it('survives a failing sweep without killing the timer', () => {
    jest.spyOn(rooms, 'all').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => janitor['safeSweep']()).not.toThrow();
  });
});
