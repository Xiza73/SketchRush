import { type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { RejoinRoomDto } from '../dtos/rejoin-room.dto';
import { RejoinRoomUseCase } from './rejoin-room.use-case';

const T0 = 1_000_000;

class FakeClock implements Clock {
  current = T0;
  now(): number {
    return this.current;
  }
}

const dto = (over: Partial<RejoinRoomDto> = {}): RejoinRoomDto =>
  Object.assign(new RejoinRoomDto(), {
    roomCode: 'ABCD',
    playerId: 'p1',
    token: 'secret-token',
    ...over,
  });

describe('RejoinRoomUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let clock: FakeClock;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let useCase: RejoinRoomUseCase;
  let room: Room;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    clock = new FakeClock();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((e) => events.push(e));
    useCase = new RejoinRoomUseCase(rooms, clock, bus);

    room = Room.create(
      'ABCD',
      {
        language: 'es',
        drawSeconds: 60,
        rounds: 3,
        capacity: 8,
        hintLetters: 1,
        guessMode: 'box' as const,
      },
      T0,
    );
    room.addPlayer(
      Player.create({
        id: 'p1',
        token: 'secret-token',
        name: 'Ana',
        isHost: true,
        joinedAt: T0,
      }),
    );
    rooms.save(room);
  });

  it('re-attaches a disconnected player and announces the lobby', () => {
    room.findPlayer('p1')!.markDisconnected(T0);
    clock.current = T0 + 5_000;

    const session = useCase.execute(dto());

    expect(session.room).toBe(room);
    expect(session.player.connected).toBe(true);
    expect(session.player.disconnectedAt).toBeNull();
    expect(room.lastActivityAt).toBe(T0 + 5_000);
    expect(events.map((e) => e.event)).toEqual(['lobby:update']);
  });

  it('answers room_not_found when the room is gone', () => {
    rooms.delete('ABCD');
    expect(() => useCase.execute(dto())).toThrow(new DomainException('room_not_found'));
  });

  it('answers session_expired when the token does not match', () => {
    expect(() => useCase.execute(dto({ token: 'wrong-token' }))).toThrow(
      new DomainException('session_expired'),
    );
    // A token of a different length must not leak through the comparison either.
    expect(() => useCase.execute(dto({ token: 'x' }))).toThrow(
      new DomainException('session_expired'),
    );
  });

  it('answers session_expired when the player was removed from the room', () => {
    room.removePlayer('p1');
    expect(() => useCase.execute(dto())).toThrow(new DomainException('session_expired'));
  });
});
