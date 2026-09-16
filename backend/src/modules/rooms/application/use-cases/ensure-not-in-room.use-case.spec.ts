import { DomainException } from '@shared/domain/domain.exception';
import { Player } from '../../domain/entities/player.entity';
import { Room } from '../../domain/entities/room.entity';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { EnsureNotInRoomUseCase } from './ensure-not-in-room.use-case';

const T0 = 1_000_000;

describe('EnsureNotInRoomUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let useCase: EnsureNotInRoomUseCase;
  let room: Room;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    useCase = new EnsureNotInRoomUseCase(rooms);
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
      Player.create({ id: 'p1', token: 't', name: 'Ana', isHost: true, joinedAt: T0 }),
    );
    rooms.save(room);
  });

  it('passes when the caller holds no seat', () => {
    expect(() => useCase.execute(null)).not.toThrow();
    expect(() => useCase.execute({})).not.toThrow();
    expect(() => useCase.execute({ roomCode: 'ABCD' })).not.toThrow();
  });

  it('rejects a caller still seated in a live room', () => {
    for (const status of ['lobby', 'drawing', 'between-turns'] as const) {
      room.status = status;
      expect(() => useCase.execute({ roomCode: 'ABCD', playerId: 'p1' })).toThrow(
        new DomainException('already_in_room'),
      );
    }
  });

  it('treats a restarted lobby as a live seat again', () => {
    room.status = 'finished';
    expect(() => useCase.execute({ roomCode: 'ABCD', playerId: 'p1' })).not.toThrow();

    // "Play again": the seat is real once more, so creating or joining elsewhere is refused.
    room.resetForNewGame(T0 + 1_000);
    expect(() => useCase.execute({ roomCode: 'ABCD', playerId: 'p1' })).toThrow(
      new DomainException('already_in_room'),
    );
  });

  it('ignores a stale seat: finished game, deleted room or player already gone', () => {
    room.status = 'finished';
    expect(() => useCase.execute({ roomCode: 'ABCD', playerId: 'p1' })).not.toThrow();

    room.status = 'drawing';
    room.removePlayer('p1');
    expect(() => useCase.execute({ roomCode: 'ABCD', playerId: 'p1' })).not.toThrow();

    rooms.delete('ABCD');
    expect(() => useCase.execute({ roomCode: 'ABCD', playerId: 'p1' })).not.toThrow();
  });
});
