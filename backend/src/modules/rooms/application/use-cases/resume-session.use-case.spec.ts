import { type Clock } from '@shared/domain/clock';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { ResumeSessionUseCase } from './resume-session.use-case';

const T0 = 1_000_000;

class FakeClock implements Clock {
  current = T0;
  now(): number {
    return this.current;
  }
}

describe('ResumeSessionUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let clock: FakeClock;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let useCase: ResumeSessionUseCase;
  let room: Room;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    clock = new FakeClock();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((e) => events.push(e));
    useCase = new ResumeSessionUseCase(rooms, clock, bus);

    room = Room.create(
      'ABCD',
      {
        language: 'es',
        drawSeconds: 60,
        rounds: 3,
        capacity: 8,
        hints: true,
        guessMode: 'box' as const,
      },
      T0,
    );
    room.addPlayer(
      Player.create({ id: 'p1', token: 'secret-token', name: 'Ana', isHost: true, joinedAt: T0 }),
    );
    rooms.save(room);
  });

  it('puts a recovered player back online and tells the room', () => {
    room.findPlayer('p1')!.markDisconnected(T0);
    clock.current = T0 + 30_000;

    expect(useCase.execute('ABCD', 'p1')).toBe(true);
    expect(room.findPlayer('p1')!.connected).toBe(true);
    expect(room.findPlayer('p1')!.disconnectedAt).toBeNull();
    expect(events.filter((e) => e.event === 'lobby:update')).toHaveLength(1);
  });

  it('refuses when the seat is gone, so the client has to rejoin properly', () => {
    room.removePlayer('p1');
    expect(useCase.execute('ABCD', 'p1')).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('refuses when the room is gone', () => {
    rooms.delete('ABCD');
    expect(useCase.execute('ABCD', 'p1')).toBe(false);
    expect(events).toHaveLength(0);
  });
});
