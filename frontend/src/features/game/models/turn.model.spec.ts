import { describe, expect, it } from 'vitest';

import type { DrawOp, TurnState } from '@/shared/contract';

import { appendOp, hiddenLetters, toTurnViewModel } from './turn.model';

const stroke = (id: number, ...points: [number, number][]): DrawOp => ({
  kind: 'stroke',
  id,
  tool: 'brush',
  color: 0,
  size: 10,
  points: points.map(([x, y]) => ({ x, y })),
});

describe('appendOp', () => {
  /**
   * The rule the server's buffer follows, mirrored here: a long line arrives in
   * chunks under one id and has to end up as one entry, or an undo would take
   * back 50 ms of hand movement instead of the whole stroke.
   */
  it('merges chunks that share the id of the last op', () => {
    const first = appendOp([], stroke(1, [0, 0], [0.1, 0.1]));
    const second = appendOp(first, stroke(1, [0.2, 0.2]));

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ kind: 'stroke', id: 1 });
    expect((second[0] as { points: unknown[] }).points).toHaveLength(3);
  });

  it('starts a new entry for a different id', () => {
    const ops = appendOp(appendOp([], stroke(1, [0, 0])), stroke(2, [0.5, 0.5]));
    expect(ops).toHaveLength(2);
  });

  /** Only the *last* op merges: a fill between two chunks ends the first line. */
  it('does not merge back across another operation', () => {
    const withFill = appendOp(appendOp([], stroke(1, [0, 0])), {
      kind: 'fill',
      id: 9,
      color: 3,
      at: { x: 0.5, y: 0.5 },
    });
    const ops = appendOp(withFill, stroke(1, [0.2, 0.2]));

    expect(ops).toHaveLength(3);
  });

  it('never mutates the array it was given', () => {
    const original = appendOp([], stroke(1, [0, 0]));
    const snapshot = JSON.stringify(original);
    appendOp(original, stroke(1, [0.9, 0.9]));
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('toTurnViewModel', () => {
  const dto = (over: Partial<TurnState> = {}): TurnState => ({
    turn: 2,
    round: 1,
    totalRounds: 3,
    drawerId: 'ana',
    order: ['ana', 'bruno'],
    drawSeconds: 60,
    startedAt: 1_000_000,
    masked: ['g', null, null, null],
    word: null,
    canvas: [],
    players: [],
    ...over,
  });

  /**
   * The deadline is derived once from the server's absolute timestamp and never
   * counted down, which is the whole reason two clocks cannot drift apart.
   */
  it('derives the deadline from startedAt and the turn length', () => {
    expect(toTurnViewModel(dto()).deadlineAt).toBe(1_000_000 + 60_000);
  });

  it('has no deadline and reads as choosing before drawing begins', () => {
    const model = toTurnViewModel(dto({ startedAt: 0 }));
    expect(model.deadlineAt).toBe(0);
    expect(model.choosing).toBe(true);
  });

  it('carries the word through untouched, including the null everyone else gets', () => {
    expect(toTurnViewModel(dto({ word: 'gato' })).word).toBe('gato');
    expect(toTurnViewModel(dto()).word).toBeNull();
  });
});

describe('hiddenLetters', () => {
  it('counts only the blanks, not the spaces or the revealed letters', () => {
    expect(hiddenLetters(['g', null, null, ' ', null])).toBe(3);
    expect(hiddenLetters(['g', 'a', 't', 'o'])).toBe(0);
  });
});
