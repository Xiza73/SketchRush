import { hintCandidates, hintSchedule, maskWord } from './word-mask';

describe('maskWord', () => {
  it('hides every letter while nothing is revealed', () => {
    expect(maskWord('gato', [])).toEqual([null, null, null, null]);
  });

  it('shows the letters that are out, in place', () => {
    expect(maskWord('gato', [0, 3])).toEqual(['g', null, null, 'o']);
  });

  it('always shows a space, so the shape of two words is visible', () => {
    expect(maskWord('el sol', [])).toEqual([null, null, ' ', null, null, null]);
  });
});

describe('hintCandidates', () => {
  it('offers every letter that is still hidden', () => {
    expect(hintCandidates('gato', [])).toEqual([0, 1, 2, 3]);
  });

  it('never offers one already out, and never a space', () => {
    expect(hintCandidates('el sol', [0])).toEqual([1, 3, 4, 5]);
  });

  it('runs out rather than repeating', () => {
    expect(hintCandidates('sol', [0, 1, 2])).toEqual([]);
  });
});

describe('hintSchedule', () => {
  it('is empty when the room turned hints off', () => {
    expect(hintSchedule(0, 60)).toEqual([]);
  });

  it('puts a single hint at half time', () => {
    expect(hintSchedule(1, 60)).toEqual([30]);
  });

  it('spreads two across the turn, and neither at the end', () => {
    expect(hintSchedule(2, 60)).toEqual([20, 40]);
  });

  it('never schedules one at the very end of the turn', () => {
    for (const count of [1, 2]) {
      for (const seconds of [40, 60, 80, 100]) {
        for (const at of hintSchedule(count, seconds)) {
          expect(at).toBeLessThan(seconds);
          expect(at).toBeGreaterThan(0);
        }
      }
    }
  });
});
