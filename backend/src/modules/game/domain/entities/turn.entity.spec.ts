import { CANVAS_POINT_LIMIT, Turn } from './turn.entity';

const T0 = 1_000_000;

const turn = (over: Partial<ConstructorParameters<typeof Turn>[0]> = {}) =>
  new Turn({ turn: 1, round: 1, drawerId: 'elena', drawSeconds: 60, hints: false, ...over });

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
    const t = turn({ hints: false });
    t.begin('castillo', T0);
    expect(t.releaseDueHints(T0 + 59_000)).toBe(false);
    expect(t.masked().every((c) => c === null)).toBe(true);
  });

  // `castillo` is eight letters, so two hints, at 20 s and 40 s of the 60.
  it('holds a hint until its moment, then lets exactly one out', () => {
    const t = turn({ hints: true });
    t.begin('castillo', T0);
    expect(t.releaseDueHints(T0 + 19_000)).toBe(false);
    expect(t.releaseDueHints(T0 + 21_000)).toBe(true);
    expect(t.revealed).toHaveLength(1);
  });

  it('catches up on every hint that came due while nobody was looking', () => {
    const t = turn({ hints: true });
    t.begin('castillo', T0);
    // One tick arriving late must not swallow the hint it slept through.
    expect(t.releaseDueHints(T0 + 45_000)).toBe(true);
    expect(t.revealed).toHaveLength(2);
  });

  it('spends the whole word and stops, however long the turn runs', () => {
    const t = turn({ hints: true });
    t.begin('sol', T0);
    t.releaseDueHints(T0 + 59_000);
    // Three letters buy exactly one hint; the rest of the turn buys nothing.
    expect(t.revealed).toHaveLength(1);
    expect(t.releaseDueHints(T0 + 59_500)).toBe(false);
  });

  it('gives a longer word more to go on', () => {
    const short = turn({ hints: true });
    short.begin('sol', T0);
    short.releaseDueHints(T0 + 59_000);

    const long = turn({ hints: true });
    long.begin('refrigerador', T0);
    long.releaseDueHints(T0 + 59_000);

    expect(short.revealed).toHaveLength(1);
    expect(long.revealed).toHaveLength(4);
  });

  it('never reveals the same position twice', () => {
    const t = turn({ hints: true });
    t.begin('refrigerador', T0);
    t.releaseDueHints(T0 + 59_000);
    expect(new Set(t.revealed).size).toBe(t.revealed.length);
  });

  it('brings the next hint forward as the room fills in', () => {
    const t = turn({ hints: true });
    t.begin('castillo', T0);
    // 12 s is nowhere near the 20 s the schedule parked the first hint at...
    expect(t.releaseDueHints(T0 + 12_000)).toBe(false);
    // ...but with half the room already home, the wait halves and it is due.
    expect(t.releaseDueHints(T0 + 12_000, 0.5)).toBe(true);
  });

  it('measures the share against the guessers, never the drawer', () => {
    const t = turn({ hints: true });
    t.begin('castillo', T0);
    const seats = ['elena', 'bruno', 'ana'];
    expect(t.guessedShare(seats)).toBe(0);
    t.recordGuess('bruno', T0 + 1000);
    // elena is drawing: one of the two who could guess, has.
    expect(t.guessedShare(seats)).toBe(0.5);
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

  it('marks a clear rather than emptying the list', () => {
    // A late joiner replays the buffer; without the marker they would repaint
    // whatever was on screen before the clear. What it covers is kept, so undo
    // can take the clear back.
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.clear();
    expect(t.canvas.map((op) => op.kind)).toEqual(['stroke', 'clear']);
  });

  it('says whether undo had anything to undo', () => {
    const t = turn();
    expect(t.undo()).toBe(false);
    t.addStroke(1, 'brush', 0, 4, points);
    expect(t.undo()).toBe(true);
  });

  it('puts back what undo took, in order', () => {
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.addFill(3, { x: 0.5, y: 0.5 });
    t.undo();
    t.undo();
    expect(t.canvas).toHaveLength(0);

    // Returns the operation itself, so the caller can tell the room what came
    // back rather than making every screen re-fetch the canvas to find out.
    expect(t.redo()).toMatchObject({ kind: 'stroke' });
    expect(t.canvas.map((op) => op.kind)).toEqual(['stroke']);
    expect(t.redo()).toMatchObject({ kind: 'fill' });
    expect(t.canvas.map((op) => op.kind)).toEqual(['stroke', 'fill']);
    expect(t.redo()).toBeNull();
  });

  it('takes a clear back, with everything it covered', () => {
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.clear();
    t.undo();
    expect(t.canvas.map((op) => op.kind)).toEqual(['stroke']);
  });

  it('drops the redo stack the moment something new is drawn', () => {
    // Every editor works this way, and the alternative is a redo that
    // resurrects a line from before the one just drawn.
    const t = turn();
    t.addStroke(1, 'brush', 0, 4, points);
    t.undo();
    t.addStroke(2, 'brush', 0, 4, points);
    expect(t.redo()).toBeNull();
    expect(t.canvas).toHaveLength(1);
  });

  it('gives the points back on undo and takes them again on redo', () => {
    const many = Array.from({ length: CANVAS_POINT_LIMIT }, () => ({ x: 0.1, y: 0.1 }));
    const t = turn();
    expect(t.addStroke(1, 'brush', 0, 4, many)).toBe(true);
    // Full: nothing more fits.
    expect(t.addStroke(2, 'brush', 0, 4, points)).toBe(false);

    t.undo();
    expect(t.addStroke(2, 'brush', 0, 4, points)).toBe(true);
  });
});
