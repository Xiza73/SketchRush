import { type GuessMode } from '@shared/contract';
import { type Clock } from '@shared/domain/clock';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '@modules/rooms/domain/entities/player.entity';
import { Room } from '@modules/rooms/domain/entities/room.entity';
import { InMemoryRoomRepository } from '@modules/rooms/infrastructure/repositories/in-memory-room.repository';
import type { ISynonyms } from '@modules/words/domain/interfaces/synonyms.interface';
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

/** One group, so a synonym here is `alcázar` and nothing else is. */
const synonyms: ISynonyms = {
  areSame: (_language, a, b) =>
    [a, b].every((word) => ['castillo', 'alcázar'].includes(word.toLowerCase())),
};

/** Ana draws; Bruno and Carla guess. */
const build = (guessMode: GuessMode, variants: ISynonyms = synonyms) => {
  const rooms = new InMemoryRoomRepository();
  const games = new InMemoryGameRepository();
  const bus = new RoomEventsBus();
  const events: OutboundEvent[] = [];
  bus.subscribe((event) => events.push(event));
  const lifecycle = new TurnLifecycleService(bus, picker);
  const guess = new SubmitGuessUseCase(rooms, games, new FakeClock(), variants, bus, lifecycle);

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
    expect(attempts[0]?.payload).toEqual({ playerId: 'bruno', verdict: 'wrong' });
  });

  it('marks a near miss as near', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', 'castilo');

    const attempt = events.find((e) => e.event === 'guess:attempt');
    expect(attempt?.payload).toEqual({ playerId: 'bruno', verdict: 'close' });
  });

  /**
   * The best news the drawer gets short of a correct guess: somebody has named
   * the thing on the canvas, they just call it something else where they live.
   * It says the drawing is working, and it still never quotes what was typed.
   */
  it('passes on that somebody named it under another word', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', 'alcázar');

    const attempt = events.find((e) => e.event === 'guess:attempt');
    expect(attempt?.payload).toEqual({ playerId: 'bruno', verdict: 'synonym' });
    expect(JSON.stringify(attempt?.payload)).not.toContain('alc');
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

describe('SubmitGuessUseCase · the verdict in the guesser’s own ack', () => {
  /** Everything is a variant of everything, to put the two rules in conflict. */
  const everything: ISynonyms = { areSame: () => true };

  it('reads the word back as correct and pays for it', () => {
    const { guess } = build('box');
    const ack = guess.execute(CODE, 'bruno', WORD);

    expect(ack).toMatchObject({ verdict: 'correct', position: 1 });
    expect(ack.points).toBeGreaterThan(0);
  });

  it('calls a regional variant a synonym, and pays nothing for it', () => {
    const { guess } = build('box');
    const ack = guess.execute(CODE, 'bruno', 'alcázar');

    expect(ack).toEqual({ verdict: 'synonym', position: null, points: 0 });
  });

  /**
   * The rule that decides which of the two fires when both could. A guess one
   * letter out is told `close`, because that points at a letter to fix; calling
   * it `synonym` would send the player hunting for a word they have already
   * essentially typed.
   */
  it('prefers close over synonym when the guess is also a slip', () => {
    const { guess } = build('box', everything);

    expect(guess.execute(CODE, 'bruno', 'castilo').verdict).toBe('close');
    expect(guess.execute(CODE, 'carla', 'elefante').verdict).toBe('synonym');
  });

  /**
   * A variant is a miss, not a spent attempt: it neither scores nor locks the
   * player out, because the mask promised a letter count `alcázar` does not
   * fill. Whoever typed it is still in the turn, now knowing what to look for
   * — which is the whole reason for telling them.
   */
  it('never lets a variant score, and never spends the attempt', () => {
    const { guess, events } = build('box');
    guess.execute(CODE, 'bruno', 'alcázar');

    expect(events.filter((e) => e.event === 'player:guessed')).toHaveLength(0);
    expect(guess.execute(CODE, 'bruno', WORD)).toMatchObject({ verdict: 'correct', position: 1 });
  });
});
