import { ROOM_LIMITS } from '@shared/contract';
import { type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { JoinRoomDto } from '../dtos/join-room.dto';
import { JoinRoomUseCase } from './join-room.use-case';
import { KickPlayerUseCase } from './kick-player.use-case';

const T0 = 1_000_000;

class FakeClock implements Clock {
  current = T0;
  now(): number {
    return this.current;
  }
}

describe('KickPlayerUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let clock: FakeClock;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let kick: KickPlayerUseCase;
  let join: JoinRoomUseCase;
  let room: Room;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    clock = new FakeClock();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((e) => events.push(e));
    kick = new KickPlayerUseCase(rooms, clock, bus);
    join = new JoinRoomUseCase(rooms, clock, bus);

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
      Player.create({ id: 'host', token: 't-host', name: 'Ana', isHost: true, joinedAt: T0 }),
    );
    room.addPlayer(
      Player.create({ id: 'other', token: 't-other', name: 'Beto', isHost: false, joinedAt: T0 }),
    );
    rooms.save(room);
  });

  it('tells the victim and blocks their name, returning who to remove', () => {
    expect(kick.execute('ABCD', 'host', 'other')).toBe('other');

    const kicked = events.find((e) => e.event === 'room:kicked');
    expect(kicked).toMatchObject({
      toPlayerId: 'other',
      payload: { roomCode: 'ABCD', rejoinAfterSeconds: ROOM_LIMITS.kickRejoinSeconds },
    });
    expect(room.nameBlockSecondsLeft('Beto', T0)).toBe(ROOM_LIMITS.kickRejoinSeconds);
  });

  it('refuses a rejoin under the same name, and says how long is left', () => {
    kick.execute('ABCD', 'host', 'other');
    room.removePlayer('other');
    clock.current = T0 + 18_000;

    // Trimmed and case-folded: the block is on the name, not on its spelling.
    const dto = Object.assign(new JoinRoomDto(), { roomCode: 'ABCD', name: '  beto ' });
    try {
      join.execute(dto);
      fail('expected the join to be refused');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      const refusal = error as DomainException;
      expect(refusal.code).toBe('kicked');
      expect(refusal.retryAfterSeconds).toBe(12);
      expect(refusal.toPayload().retryAfterSeconds).toBe(12);
    }
  });

  it('lets the name back in once the block has run out', () => {
    kick.execute('ABCD', 'host', 'other');
    room.removePlayer('other');
    clock.current = T0 + ROOM_LIMITS.kickRejoinSeconds * 1000 + 1;

    const dto = Object.assign(new JoinRoomDto(), { roomCode: 'ABCD', name: 'Beto' });
    expect(() => join.execute(dto)).not.toThrow();
  });

  it('is host only, and never on the host themselves', () => {
    const codeOf = (run: () => void): string => {
      try {
        run();
      } catch (error) {
        return error instanceof DomainException ? error.code : 'not-a-domain-exception';
      }
      return 'did-not-throw';
    };

    expect(codeOf(() => kick.execute('ABCD', 'other', 'host'))).toBe('not_host');
    expect(codeOf(() => kick.execute('ABCD', 'host', 'host'))).toBe('invalid_payload');
    expect(codeOf(() => kick.execute('ABCD', 'host', 'nobody'))).toBe('invalid_payload');
  });
});
