import type { RoomSettings } from '@shared/contract';
import { type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { UpdateRoomSettingsUseCase } from './update-room-settings.use-case';

const T0 = 1_000_000;

class FakeClock implements Clock {
  now(): number {
    return T0;
  }
}

const BASE: RoomSettings = {
  language: 'es',
  drawSeconds: 90,
  rounds: 3,
  capacity: 8,
  hints: true,
  guessMode: 'box' as const,
};

describe('UpdateRoomSettingsUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let useCase: UpdateRoomSettingsUseCase;
  let room: Room;

  const addPlayer = (id: string, isHost = false) => {
    const player = Player.create({ id, token: `t-${id}`, name: id, isHost, joinedAt: T0 });
    room.addPlayer(player);
    return player;
  };

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((event) => events.push(event));
    useCase = new UpdateRoomSettingsUseCase(rooms, new FakeClock(), bus);

    room = Room.create('ABCD', { ...BASE }, T0);
    rooms.save(room);
    addPlayer('host', true);
    addPlayer('b');
  });

  it('lets the host rewrite every setting and broadcasts the new lobby', () => {
    useCase.execute('ABCD', 'host', {
      language: 'en',
      drawSeconds: 60,
      rounds: 5,
      capacity: 3,
      hints: false,
      guessMode: 'box' as const,
    });

    expect(room.settings).toEqual({
      language: 'en',
      drawSeconds: 60,
      rounds: 5,
      capacity: 3,
      hints: false,
      guessMode: 'box' as const,
    });
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('lobby:update');
    expect(room.toLobbyState().settings.language).toBe('en');
  });

  it('keeps the ready flags: the rules changed, not the room', () => {
    room.findPlayer('b')!.ready = true;

    useCase.execute('ABCD', 'host', { ...BASE, rounds: 10 });

    expect(room.findPlayer('b')!.ready).toBe(true);
  });

  it('refuses a guest', () => {
    expect(() => useCase.execute('ABCD', 'b', { ...BASE, rounds: 1 })).toThrow(
      new DomainException('not_host'),
    );
    expect(room.settings.rounds).toBe(3);
    expect(events).toHaveLength(0);
  });

  it('refuses once the game is running', () => {
    room.status = 'drawing';

    expect(() => useCase.execute('ABCD', 'host', { ...BASE, rounds: 1 })).toThrow(
      new DomainException('game_in_progress'),
    );
    expect(room.settings.rounds).toBe(3);
  });

  it('refuses a capacity below the players already in the room', () => {
    let thrown: DomainException | null = null;
    try {
      useCase.execute('ABCD', 'host', { ...BASE, capacity: 1 });
    } catch (error) {
      thrown = error as DomainException;
    }

    expect(thrown?.code).toBe('invalid_payload');
    // The message must name the obstacle, not just "invalid payload".
    expect(thrown?.message).toContain('2 players');
    expect(room.settings.capacity).toBe(8);
  });

  it('accepts a capacity exactly equal to the players in the room', () => {
    useCase.execute('ABCD', 'host', { ...BASE, capacity: 2 });

    expect(room.settings.capacity).toBe(2);
    expect(room.isFull()).toBe(true);
  });

  it('refuses somebody who is not in the room', () => {
    expect(() => useCase.execute('ABCD', 'ghost', { ...BASE })).toThrow(
      new DomainException('not_in_room'),
    );
  });
});
