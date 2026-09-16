import { type GuessMode } from '@shared/contract';
import { type Clock } from '@shared/domain/clock';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '@modules/rooms/domain/entities/player.entity';
import { Room } from '@modules/rooms/domain/entities/room.entity';
import { InMemoryRoomRepository } from '@modules/rooms/infrastructure/repositories/in-memory-room.repository';
import type { IWordPicker } from '@modules/words/domain/interfaces/word-picker.interface';
import { Game } from '../../domain/entities/game.entity';
import { InMemoryGameRepository } from '../../infrastructure/repositories/in-memory-game.repository';
import { TurnLifecycleService } from '../services/turn-lifecycle.service';
import { SubmitGuessUseCase } from './submit-guess.use-case';

const T0 = 1_000_000;
const CODE = 'ABCD';
const WORD = 'castillo';

const picker: IWordPicker = {
  pick: (_lang, count) =>
    Array.from({ length: count }, (_, i) => ({ word: `w${i}`, category: 'objects' as const })),
};

class FakeClock implements Clock {
  now(): number {
    return T0;
  }
}

/** Ana draws; Bruno and Carla guess. */
const build = (guessMode: GuessMode) => {
  const rooms = new InMemoryRoomRepository();
  const games = new InMemoryGameRepository();
  const bus = new RoomEventsBus();
  const events: OutboundEvent[] = [];
  bus.subscribe((event) => events.push(event));
  const lifecycle = new TurnLifecycleService(bus, picker);
  const guess = new SubmitGuessUseCase(rooms, games, new FakeClock(), bus, lifecycle);

  const room = Room.create(
    CODE,
    {
      language: 'es',
      drawSeconds: 60,
      rounds: 1,
      capacity: 8,
      hints: false,
      guessMode,
    },
    T0,
  );
  for (const [index, id] of ['ana', 'bruno', 'carla'].entries()) {
    room.addPlayer(
      Player.create({ id, token: `t-${id}`, name: id, isHost: index === 0, joinedAt: T0 }),
    );
  }
  rooms.save(room);

  const game = new Game(
    CODE,
    room.players.map((p) => p.id),
    1,
  );
  games.save(game);
  lifecycle.startTurn(game, room, T0);
  lifecycle.beginDrawing(game, room, WORD, T0);
  events.length = 0;

  return { guess, events, game, room };
};

describe('SubmitGuessUseCase · what the room is told', () => {
  it('tells nobody what a wrong guess said', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', 'elefante');

    for (const event of events) {
      expect(JSON.stringify(event.payload)).not.toContain('elefante');
    }
  });

  it('announces a correct guess to the room without the word', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', WORD);

    const guessed = events.filter((e) => e.event === 'player:guessed');
    expect(guessed).toHaveLength(1);
    expect(guessed[0]?.toPlayerId).toBeUndefined();
    expect(JSON.stringify(guessed[0]?.payload)).not.toContain(WORD);
  });
});

describe('SubmitGuessUseCase · the drawer watching a box room', () => {
  it('tells the drawer, and only the drawer, that somebody missed', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', 'elefante');

    const attempts = events.filter((e) => e.event === 'guess:attempt');
    expect(attempts).toHaveLength(1);
    // Addressed, not broadcast: the other guessers must not learn that Bruno
    // tried, let alone how near he got.
    expect(attempts[0]?.toPlayerId).toBe('ana');
    expect(attempts[0]?.payload).toEqual({ playerId: 'bruno', close: false });
  });

  it('marks a near miss as near', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', 'castilo');

    const attempt = events.find((e) => e.event === 'guess:attempt');
    expect(attempt?.payload).toEqual({ playerId: 'bruno', close: true });
  });

  it('says nothing when the guess was right — that is `player:guessed`', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', WORD);

    expect(events.filter((e) => e.event === 'guess:attempt')).toHaveLength(0);
  });

  it('stays quiet in a chat room, where the drawer already reads every attempt', () => {
    const { guess, events } = build('chat');
    guess.execute(CODE, 'bruno', 'elefante');

    expect(events.filter((e) => e.event === 'guess:attempt')).toHaveLength(0);
    expect(events.filter((e) => e.event === 'chat:message')).toHaveLength(1);
  });

  it('drops a chat message that gives the word away, whoever sent it', () => {
    const { guess, events } = build('chat');
    guess.execute(CODE, 'bruno', `creo que es un ${WORD}`);

    expect(events.filter((e) => e.event === 'chat:message')).toHaveLength(0);
  });
});
