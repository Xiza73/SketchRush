import { type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { InMemoryRoomRepository } from '../../infrastructure/repositories/in-memory-room.repository';
import { type CreateRoomDto } from '../dtos/create-room.dto';
import { CreateRoomUseCase } from './create-room.use-case';

const T0 = 1_000_000;

class FakeClock implements Clock {
  current = T0;
  now(): number {
    return this.current;
  }
}

const dto: CreateRoomDto = {
  name: 'ana',
  settings: {
    language: 'es',
    drawSeconds: 60,
    rounds: 3,
    capacity: 8,
    hints: true,
    guessMode: 'box' as const,
  },
};

describe('CreateRoomUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let clock: FakeClock;

  const useCaseWithCap = (maxRooms: number) => new CreateRoomUseCase(rooms, clock, maxRooms);

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    clock = new FakeClock();
  });

  it('seats the creator as host of a fresh room', () => {
    const { room, player } = useCaseWithCap(500).execute(dto);

    expect(room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(room.status).toBe('lobby');
    expect(player.isHost).toBe(true);
    expect(player.name).toBe('ana');
    expect(rooms.findByCode(room.code)).toBe(room);
  });

  it('hands every room its own code and every player their own token', () => {
    const useCase = useCaseWithCap(500);
    const first = useCase.execute(dto);
    const second = useCase.execute(dto);

    expect(first.room.code).not.toBe(second.room.code);
    expect(first.player.token).not.toBe(second.player.token);
    expect(first.player.id).not.toBe(second.player.id);
  });

  it('refuses to create past the cap instead of letting memory run out', () => {
    const useCase = useCaseWithCap(2);
    useCase.execute(dto);
    useCase.execute(dto);

    expect(() => useCase.execute(dto)).toThrow(DomainException);
    expect(() => useCase.execute(dto)).toThrow(
      expect.objectContaining({ code: 'server_full' }) as Error,
    );
    expect(rooms.count()).toBe(2);
  });

  it('creates again as soon as the janitor frees a slot', () => {
    const useCase = useCaseWithCap(1);
    const { room } = useCase.execute(dto);
    expect(() => useCase.execute(dto)).toThrow(DomainException);

    rooms.delete(room.code);

    expect(() => useCase.execute(dto)).not.toThrow();
    expect(rooms.count()).toBe(1);
  });
});
