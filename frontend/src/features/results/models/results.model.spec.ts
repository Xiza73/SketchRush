import { describe, expect, it } from 'vitest';

import type { Standing, TurnBreakdownRow, TurnEndPayload } from '@/shared/contract';

import { toStandingViewModels, toTurnResultsViewModel } from './results.model';

const row = (over: Partial<TurnBreakdownRow> & { playerId: string }): TurnBreakdownRow => ({
  name: over.playerId,
  drawer: false,
  guessed: false,
  timePercent: null,
  timePoints: 0,
  position: null,
  positionBonus: 0,
  allGuessedBonus: 0,
  turnPoints: 0,
  ...over,
});

const standing = (over: Partial<Standing> & { playerId: string }): Standing => ({
  name: over.playerId,
  total: 0,
  guessed: 0,
  secondsUsed: 0,
  rank: 1,
  ...over,
});

const payload = (over: Partial<TurnEndPayload> = {}): TurnEndPayload => ({
  turn: 2,
  totalTurns: 2,
  round: 1,
  totalRounds: 1,
  turnInRound: 2,
  turnsPerRound: 2,
  word: 'plato',
  breakdown: [],
  standings: [],
  nextTurnIn: 0,
  ...over,
});

describe('toTurnResultsViewModel · who could have guessed', () => {
  /**
   * The drawer knew the word. Counting them among the people who missed it is a
   * lie that gets louder the smaller the room is — in a room of two it turns
   * "one player missed it" into "two".
   */
  it('counts guessers as the table minus the drawer', () => {
    const results = toTurnResultsViewModel(
      payload({
        breakdown: [
          row({ playerId: 'ana', drawer: true }),
          row({ playerId: 'bruno', guessed: true, position: 1 }),
          row({ playerId: 'carla' }),
        ],
      }),
      'bruno',
      null,
    );

    expect(results.playerCount).toBe(3);
    expect(results.guesserCount).toBe(2);
    expect(results.guessedCount).toBe(1);
  });
});

describe('toTurnResultsViewModel · the tie-break', () => {
  const tied = (first: Partial<Standing>, second: Partial<Standing>) =>
    toTurnResultsViewModel(
      payload({
        standings: [
          standing({ playerId: 'a', total: 115, rank: 1, ...first }),
          standing({ playerId: 'b', total: 115, rank: 2, ...second }),
        ],
      }),
      'b',
      null,
    ).decidedBy;

  it('names seconds when the totals and the turns guessed are level', () => {
    expect(tied({ guessed: 1, secondsUsed: 29 }, { guessed: 1, secondsUsed: 42 })).toEqual({
      total: 115,
      rule: 'seconds',
    });
  });

  it('names turns guessed when that is what separated them', () => {
    expect(tied({ guessed: 2, secondsUsed: 29 }, { guessed: 1, secondsUsed: 29 })).toEqual({
      total: 115,
      rule: 'guessed',
    });
  });

  /** A real dead heat claims no rule: both of them are first. */
  it('claims nothing when they are level on every key', () => {
    expect(tied({ guessed: 1, secondsUsed: 29 }, { guessed: 1, secondsUsed: 29 })).toBeNull();
  });

  it('claims nothing when the totals were never equal', () => {
    const decidedBy = toTurnResultsViewModel(
      payload({
        standings: [
          standing({ playerId: 'a', total: 120, rank: 1 }),
          standing({ playerId: 'b', total: 115, rank: 2 }),
        ],
      }),
      'b',
      null,
    ).decidedBy;
    expect(decidedBy).toBeNull();
  });

  it('claims nothing in a room of one', () => {
    expect(
      toTurnResultsViewModel(
        payload({ standings: [standing({ playerId: 'a', total: 115 })] }),
        'a',
        null,
      ).decidedBy,
    ).toBeNull();
  });
});

describe('toStandingViewModels', () => {
  it('orders by rank and measures every bar against the leader', () => {
    const models = toStandingViewModels(
      [
        standing({ playerId: 'b', total: 50, rank: 2 }),
        standing({ playerId: 'a', total: 100, rank: 1 }),
      ],
      'b',
    );

    expect(models.map((m) => m.playerId)).toEqual(['a', 'b']);
    expect(models.map((m) => m.barPercent)).toEqual([100, 50]);
    expect(models.find((m) => m.isMe)?.playerId).toBe('b');
  });

  /** Nobody has scored yet: the bars must not divide by zero. */
  it('survives a table where everybody is on zero', () => {
    const models = toStandingViewModels(
      [standing({ playerId: 'a' }), standing({ playerId: 'b' })],
      'a',
    );
    expect(models.map((m) => m.barPercent)).toEqual([0, 0]);
  });
});
