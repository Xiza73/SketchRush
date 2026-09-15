import { type Clock } from '@shared/domain/clock';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { LeaveRoomUseCase } from './leave-room.use-case';

const T0 = 1_000_000;

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
  hintLetters: 1,
  guessMode: 'box' as const,
};

const player = (id: string, name: string, isHost: boolean, joinedAt: number) =>
  Player.create({ id, token: `token-${id}`, name, isHost, joinedAt });

describe('LeaveRoomUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let clock: FakeClock;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let useCase: LeaveRoomUseCase;
  let room: Room;

  const eventNames = () => events.map((e) => e.event);
  const payloadOf = <T extends OutboundEvent['event']>(name: T) =>
    events.find((e) => e.event === name)?.payload;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    clock = new FakeClock();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((e) => events.push(e));
    useCase = new LeaveRoomUseCase(rooms, clock, bus);

    room = Room.create('ABCD', settings, T0);
    room.addPlayer(player('p1', 'Ana', true, T0));
    room.addPlayer(player('p2', 'Bruno', false, T0 + 1_000));
    room.addPlayer(player('p3', 'Carla', false, T0 + 2_000));
    rooms.save(room);
  });

  it('frees the seat and announces who left', () => {
    useCase.execute('ABCD', 'p2');

    expect(room.findPlayer('p2')).toBeUndefined();
    expect(eventNames()).toEqual(['player:left', 'lobby:update']);
    expect(payloadOf('player:left')).toEqual({
      playerId: 'p2',
      name: 'Bruno',
      newHostId: null,
    });
  });

  it('frees the seat mid-game too, and says nothing about the turn', () => {
    // Ending the turn a leaver was part of belongs to the `game` module. This
    // use case must not grow an opinion about it: it frees the seat and stops.
    room.status = 'drawing';
    clock.current = T0 + 5_000;

    useCase.execute('ABCD', 'p2');

    expect(room.findPlayer('p2')).toBeUndefined();
    expect(eventNames()).toEqual(['player:left', 'lobby:update']);
  });

  it('promotes the oldest remaining connected player when the host leaves', () => {
    room.findPlayer('p2')!.markDisconnected(T0 + 100);

    useCase.execute('ABCD', 'p1');

    expect(room.findPlayer('p2')!.isHost).toBe(false);
    expect(room.findPlayer('p3')!.isHost).toBe(true);
    expect(payloadOf('player:left')).toEqual({ playerId: 'p1', name: 'Ana', newHostId: 'p3' });
  });

  it('falls back to the oldest player when nobody left is connected', () => {
    room.findPlayer('p2')!.markDisconnected(T0 + 100);
    room.findPlayer('p3')!.markDisconnected(T0 + 100);

    useCase.execute('ABCD', 'p1');

    expect(room.findPlayer('p2')!.isHost).toBe(true);
  });

  it('deletes the room when the last player leaves', () => {
    useCase.execute('ABCD', 'p1');
    useCase.execute('ABCD', 'p2');
    events = [];

    useCase.execute('ABCD', 'p3');

    expect(rooms.findByCode('ABCD')).toBeUndefined();
    expect(eventNames()).toEqual([]);
  });

  it('is idempotent and silent for an unknown room or player', () => {
    useCase.execute('ABCD', 'p2');
    events = [];

    useCase.execute('ABCD', 'p2');
    useCase.execute('ZZZZ', 'p1');

    expect(eventNames()).toEqual([]);
    expect(room.players).toHaveLength(2);
  });
});
