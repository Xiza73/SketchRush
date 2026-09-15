import { Turn } from './turn.entity';

const T0 = 1_000_000;

const turn = (over: Partial<ConstructorParameters<typeof Turn>[0]> = {}) =>
  new Turn({ turn: 1, round: 1, drawerId: 'elena', drawSeconds: 60, hintLetters: 0, ...over });

describe('Turn · the clock', () => {
  it('is worth nothing until the drawer has picked', () => {
    const t = turn();
    expect(t.phase).toBe('choosing');
    expect(t.secondsLeft(T0)).toBe(0);
    expect(t.timePercent(T0)).toBe(0);
  });

  it('runs off an absolute deadline set once when drawing starts', () => {
    const t = turn();
    t.begin('gato', T0);
    expect(t.secondsLeft(T0)).toBe(60);
    expect(t.secondsLeft(T0 + 15_000)).toBe(45);
    expect(t.timePercent(T0 + 15_000)).toBe(75);
  });

  it('floors at zero rather than going negative', () => {
    const t = turn();
    t.begin('gato', T0);
    expect(t.secondsLeft(T0 + 120_000)).toBe(0);
    expect(t.timePercent(T0 + 120_000)).toBe(0);
    expect(t.isOutOfTime(T0 + 120_000)).toBe(true);
  });

  it('is not out of time before the deadline, nor once it has ended', () => {
    const t = turn();
    t.begin('gato', T0);
    expect(t.isOutOfTime(T0 + 59_000)).toBe(false);
    t.end();
    expect(t.isOutOfTime(T0 + 120_000)).toBe(false);
  });
});

describe('Turn · guesses', () => {
  it('records the place, the clock and the seconds spent', () => {
    const t = turn();
    t.begin('gato', T0);

    const first = t.recordGuess('ana', T0 + 12_000);
    expect(first).toEqual({ playerId: 'ana', position: 1, timePercent: 80, secondsUsed: 12 });

    const second = t.recordGuess('bruno', T0 + 30_000);
    expect(second.position).toBe(2);
    expect(second.timePercent).toBe(50);
  });

  it('knows who has already guessed', () => {
    const t = turn();
    t.begin('gato', T0);
    expect(t.hasGuessed('ana')).toBe(false);
    t.recordGuess('ana', T0);
    expect(t.hasGuessed('ana')).toBe(true);
  });

  it('is finished when everybody but the drawer has it', () => {
    const t = turn();
    const seats = ['elena', 'ana', 'bruno'];
    t.begin('gato', T0);
    t.recordGuess('ana', T0);
    expect(t.everybodyGuessed(seats)).toBe(false);
    t.recordGuess('bruno', T0);
    expect(t.everybodyGuessed(seats)).toBe(true);
  });

  it('does not close on a guess belonging to somebody who left', () => {
    const t = turn();
    t.begin('gato', T0);
    // Ana got it and walked out; Bruno and Carla are still on it.
    t.recordGuess('ana', T0);
    expect(t.everybodyGuessed(['elena', 'bruno', 'carla'])).toBe(false);
    t.recordGuess('bruno', T0);
    expect(t.everybodyGuessed(['elena', 'bruno', 'carla'])).toBe(false);
    t.recordGuess('carla', T0);
    expect(t.everybodyGuessed(['elena', 'bruno', 'carla'])).toBe(true);
  });

  it('is not finished when the drawer is the only one left', () => {
    const t = turn();
    t.begin('gato', T0);
    expect(t.everybodyGuessed(['elena'])).toBe(false);
  });
});

describe('Turn · hints', () => {
  it('releases nothing when the room turned them off', () => {
    const t = turn({ hintLetters: 0 });
    t.begin('castillo', T0);
    expect(t.releaseDueHints(T0 + 59_000)).toBe(false);
    expect(t.masked().every((c) => c === null)).toBe(true);
  });

  it('holds a hint until its moment, then lets exactly one out', () => {
    const t = turn({ hintLetters: 1 });
    t.begin('castillo', T0);
    expect(t.releaseDueHints(T0 + 29_000)).toBe(false);
    expect(t.releaseDueHints(T0 + 31_000)).toBe(true);
    expect(t.revealed).toHaveLength(1);
  });

  it('catches up on every hint that came due while nobody was looking', () => {
    const t = turn({ hintLetters: 2 });
    t.begin('castillo', T0);
    // One tick arriving late must not swallow the hint it slept through.
    expect(t.releaseDueHints(T0 + 55_000)).toBe(true);
    expect(t.revealed).toHaveLength(2);
  });

  it('never reveals the same position twice', () => {
    const t = turn({ hintLetters: 2 });
    t.begin('sol', T0);
    t.releaseDueHints(T0 + 59_000);
    expect(new Set(t.revealed).size).toBe(t.revealed.length);
  });
});

describe('Turn · the canvas', () => {
  const points = [{ x: 0.1, y: 0.2 }];

  it('appends to the stroke already in flight instead of starting another', () => {
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.addStroke(1, 'brush', 0, 4, [{ x: 0.3, y: 0.4 }]);
    expect(t.canvas).toHaveLength(1);
    expect(t.canvas[0]).toMatchObject({ kind: 'stroke', points: [points[0], { x: 0.3, y: 0.4 }] });
  });

  it('starts a new entry once the id changes', () => {
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.addStroke(2, 'eraser', 2, 20, points);
    expect(t.canvas).toHaveLength(2);
  });

  it('undoes the last operation whatever kind it was', () => {
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.addFill(3, { x: 0.5, y: 0.5 });
    t.undo();
    expect(t.canvas).toHaveLength(1);
    expect(t.canvas[0]?.kind).toBe('stroke');
  });

  it('leaves a clear behind rather than an empty list', () => {
    // A late joiner replays the buffer; without the marker they would repaint
    // whatever was on screen before the clear.
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.clear();
    expect(t.canvas).toEqual([{ kind: 'clear', id: expect.any(Number) }]);
  });
});
