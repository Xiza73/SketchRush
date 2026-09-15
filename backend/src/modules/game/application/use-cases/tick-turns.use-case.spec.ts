import { Logger } from '@nestjs/common';
import { ROOM_LIMITS, type Language } from '@shared/contract';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '@modules/rooms/domain/entities/player.entity';
import { Room } from '@modules/rooms/domain/entities/room.entity';
import { InMemoryRoomRepository } from '@modules/rooms/infrastructure/repositories/in-memory-room.repository';
import type { IWordPicker } from '@modules/words/domain/interfaces/word-picker.interface';
import { Game } from '../../domain/entities/game.entity';
import { InMemoryGameRepository } from '../../infrastructure/repositories/in-memory-game.repository';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';
import { TickTurnsUseCase } from './tick-turns.use-case';

const T0 = 1_000_000;

const settings = {
  language: 'es' as Language,
  drawSeconds: 60,
  rounds: 1,
  capacity: 8,
  hintLetters: 0,
  guessMode: 'box' as const,
};

const picker: IWordPicker = {
  pick: (_lang, count) => Array.from({ length: count }, (_, i) => `w${i}`),
};

function seed(rooms: InMemoryRoomRepository, games: InMemoryGameRepository, code: string): Game {
  const room = Room.create(code, settings, T0);
  for (const [index, id] of [`${code}-ana`, `${code}-bruno`].entries()) {
    room.addPlayer(
      Player.create({ id, token: `t-${id}`, name: id, isHost: index === 0, joinedAt: T0 }),
    );
  }
  rooms.save(room);
  const game = new Game(
    code,
    room.players.map((p) => p.id),
    settings.rounds,
  );
  games.save(game);
  return game;
}

describe('TickTurnsUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let games: InMemoryGameRepository;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let lifecycle: TurnLifecycleService;
  let tick: TickTurnsUseCase;
  let logged: jest.SpyInstance;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    games = new InMemoryGameRepository();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((event) => events.push(event));
    lifecycle = new TurnLifecycleService(bus, picker);
    tick = new TickTurnsUseCase(rooms, games, bus, lifecycle);
    logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('takes the first word for a drawer who never picked', () => {
    const game = seed(rooms, games, 'AAAA');
    lifecycle.startTurn(game, rooms.findByCode('AAAA')!, T0);
    expect(game.current?.phase).toBe('choosing');

    tick.execute(T0 + ROOM_LIMITS.chooseSeconds * 1000);

    expect(game.current?.phase).toBe('drawing');
    expect(game.current?.word).toBe('w0');
  });

  it('ends the turn when the drawing clock runs out', () => {
    const game = seed(rooms, games, 'BBBB');
    const room = rooms.findByCode('BBBB')!;
    lifecycle.startTurn(game, room, T0);
    lifecycle.beginDrawing(game, room, 'gato', T0);

    tick.execute(T0 + settings.drawSeconds * 1000 - 1);
    expect(game.current?.phase).toBe('drawing');

    tick.execute(T0 + settings.drawSeconds * 1000);
    expect(game.current?.phase).toBe('ended');
    expect(events.some((e) => e.event === 'turn:end')).toBe(true);
  });

  it('drops a game whose room the janitor already took', () => {
    seed(rooms, games, 'CCCC');
    rooms.delete('CCCC');

    tick.execute(T0);

    expect(games.find('CCCC')).toBeUndefined();
  });

  /**
   * The reason the try/catch sits inside the loop rather than around it. Map
   * iteration is insertion order, so a room that throws every tick would
   * otherwise silently starve every room created after it — four times a
   * second, for as long as the process lives. WordRush shipped that bug.
   */
  it('keeps ticking the rooms behind one that throws', () => {
    const broken = seed(rooms, games, 'DEAD');
    const healthy = seed(rooms, games, 'GOOD');
    lifecycle.startTurn(broken, rooms.findByCode('DEAD')!, T0);
    lifecycle.startTurn(healthy, rooms.findByCode('GOOD')!, T0);

    Object.defineProperty(broken.current!, 'chooseDeadlineAt', {
      get() {
        throw new Error('this room is poison');
      },
    });

    const late = T0 + ROOM_LIMITS.chooseSeconds * 1000;
    expect(() => tick.execute(late)).not.toThrow();

    expect(healthy.current?.phase).toBe('drawing');
  });

  it('reports a failing room once, not on every tick', () => {
    const broken = seed(rooms, games, 'DEAD');
    lifecycle.startTurn(broken, rooms.findByCode('DEAD')!, T0);
    Object.defineProperty(broken.current!, 'chooseDeadlineAt', {
      get() {
        throw new Error('this room is poison');
      },
    });

    for (let i = 0; i < 20; i++) tick.execute(T0 + i);

    expect(logged).toHaveBeenCalledTimes(1);
  });
});
