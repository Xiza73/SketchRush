import { type Language } from '@shared/contract';
import { type Clock } from '@shared/domain/clock';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '@modules/rooms/domain/entities/player.entity';
import { Room } from '@modules/rooms/domain/entities/room.entity';
import { InMemoryRoomRepository } from '@modules/rooms/infrastructure/repositories/in-memory-room.repository';
import type { IWordPicker } from '@modules/words/domain/interfaces/word-picker.interface';
import { Game } from '../../domain/entities/game.entity';
import { InMemoryGameRepository } from '../../infrastructure/repositories/in-memory-game.repository';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';
import { HandlePlayerLeftUseCase } from './handle-player-left.use-case';

const T0 = 1_000_000;
const CODE = 'ABCD';

const settings = {
  language: 'es' as Language,
  drawSeconds: 60,
  rounds: 3,
  capacity: 8,
  hints: false,
  guessMode: 'box' as const,
};

const picker: IWordPicker = {
  pick: (_lang, count) =>
    Array.from({ length: count }, (_, i) => ({ word: `w${i}`, category: 'objects' as const })),
};

class FakeClock implements Clock {
  now(): number {
    return T0;
  }
}

describe('HandlePlayerLeftUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let games: InMemoryGameRepository;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let lifecycle: TurnLifecycleService;
  let left: HandlePlayerLeftUseCase;
  let room: Room;
  let game: Game;

  /** Ana draws; Bruno, Carla and Dani guess. */
  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    games = new InMemoryGameRepository();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((event) => events.push(event));
    lifecycle = new TurnLifecycleService(bus, picker);
    left = new HandlePlayerLeftUseCase(rooms, games, new FakeClock(), lifecycle);

    room = Room.create(CODE, settings, T0);
    for (const [index, id] of ['ana', 'bruno', 'carla', 'dani'].entries()) {
      room.addPlayer(
        Player.create({ id, token: `t-${id}`, name: id, isHost: index === 0, joinedAt: T0 }),
      );
    }
    rooms.save(room);
    game = new Game(
      CODE,
      room.players.map((p) => p.id),
      settings.rounds,
    );
    games.save(game);
    lifecycle.startTurn(game, room, T0);
    lifecycle.beginDrawing(game, room, 'gato', T0);
    events.length = 0;
  });

  it('ends the turn at once when the drawer walks out', () => {
    room.removePlayer('ana');
    left.execute(CODE, 'ana');

    expect(game.current?.phase).toBe('ended');
    expect(events.filter((e) => e.event === 'turn:end')).toHaveLength(1);
  });

  it('lets the turn run when a guesser who had not guessed leaves', () => {
    room.removePlayer('dani');
    left.execute(CODE, 'dani');

    expect(game.current?.phase).toBe('drawing');
  });

  it('closes the turn when the leaver was the last one still thinking', () => {
    game.current!.recordGuess('bruno', T0);
    game.current!.recordGuess('carla', T0);
    room.removePlayer('dani');
    left.execute(CODE, 'dani');

    expect(game.current?.phase).toBe('ended');
  });

  it('does not close on a guess belonging to somebody who already left', () => {
    // Bruno got it and walked out; Carla and Dani are still on it.
    game.current!.recordGuess('bruno', T0);
    room.removePlayer('bruno');
    left.execute(CODE, 'bruno');

    expect(game.current?.phase).toBe('drawing');
  });

  it('ends the game rather than dealing turns to a room of one', () => {
    room.removePlayer('bruno');
    room.removePlayer('carla');
    room.removePlayer('dani');
    left.execute(CODE, 'dani');

    expect(events.some((e) => e.event === 'game:end')).toBe(true);
    expect(game.nextTurnAt).toBeNull();
    expect(room.status).toBe('finished');
  });

  it('reveals nothing when the drawer left before picking a word', () => {
    const fresh = new Game(CODE, ['ana', 'bruno'], 3);
    games.save(fresh);
    lifecycle.startTurn(fresh, room, T0);
    events.length = 0;

    const drawerId = fresh.current!.drawerId;
    room.removePlayer(drawerId);
    left.execute(CODE, drawerId);

    // No turn:end at all: an empty reveal is worse than no reveal.
    expect(events.some((e) => e.event === 'turn:end')).toBe(false);
    expect(fresh.current?.phase).toBe('ended');
  });
});
