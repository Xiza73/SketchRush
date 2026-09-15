import { SCORING } from '@shared/contract';
import { computeStandings, scoreTurn, type TurnScoreInput } from './scoring';

const players = [
  { id: 'elena', name: 'Elena' },
  { id: 'ana', name: 'Ana' },
  { id: 'bruno', name: 'Bruno' },
  { id: 'carla', name: 'Carla' },
  { id: 'dani', name: 'Dani' },
];

const turn = (over: Partial<TurnScoreInput> = {}): TurnScoreInput => ({
  drawerId: 'elena',
  players,
  guesses: [],
  ...over,
});

const pointsOf = (rows: ReturnType<typeof scoreTurn>, id: string) =>
  rows.find((row) => row.playerId === id)?.turnPoints;

describe('scoreTurn · the worked example from docs/context/03', () => {
  /*
   * Room of five, Dani never gets it. These are the exact numbers the scoring
   * document prints, so if the formula drifts from what the players were told,
   * this is what says so.
   */
  const rows = scoreTurn(
    turn({
      guesses: [
        { playerId: 'ana', timePercent: 80, position: 1 },
        { playerId: 'bruno', timePercent: 60, position: 2 },
        { playerId: 'carla', timePercent: 20, position: 3 },
      ],
    }),
  );

  it('pays each guesser their clock plus their place', () => {
    expect(pointsOf(rows, 'ana')).toBe(100);
    expect(pointsOf(rows, 'bruno')).toBe(75);
    expect(pointsOf(rows, 'carla')).toBe(30);
  });

  it('pays nothing to whoever never gets it', () => {
    expect(pointsOf(rows, 'dani')).toBe(0);
  });

  it("pays the drawer the room's average, counting the miss as a zero", () => {
    // (80 + 60 + 20) / 4 = 40, and no all-guessed bonus because Dani missed.
    expect(pointsOf(rows, 'elena')).toBe(40);
    expect(rows.find((row) => row.drawer)?.allGuessedBonus).toBe(0);
  });

  it('reports a total that is exactly the sum of the parts it shows', () => {
    for (const row of rows) {
      expect(row.turnPoints).toBe(row.timePoints + row.positionBonus + row.allGuessedBonus);
    }
  });
});

describe('scoreTurn · the shape of it', () => {
  it('gives the drawer nothing when nobody guesses', () => {
    const rows = scoreTurn(turn());
    expect(pointsOf(rows, 'elena')).toBe(0);
    expect(rows.every((row) => row.turnPoints === 0)).toBe(true);
  });

  it('adds the bonus only when every other player got it', () => {
    const all = scoreTurn(
      turn({
        guesses: [
          { playerId: 'ana', timePercent: 100, position: 1 },
          { playerId: 'bruno', timePercent: 100, position: 2 },
          { playerId: 'carla', timePercent: 100, position: 3 },
          { playerId: 'dani', timePercent: 100, position: 4 },
        ],
      }),
    );
    // 400 / 4 = 100, plus the bonus.
    expect(pointsOf(all, 'elena')).toBe(100 + SCORING.allGuessedBonus);
  });

  it('caps a perfect drawer under the fastest guesser, level with the second', () => {
    const all = scoreTurn(
      turn({
        guesses: [
          { playerId: 'ana', timePercent: 100, position: 1 },
          { playerId: 'bruno', timePercent: 100, position: 2 },
          { playerId: 'carla', timePercent: 100, position: 3 },
          { playerId: 'dani', timePercent: 100, position: 4 },
        ],
      }),
    );
    // Drawing well is worth about as much as guessing first, and never more:
    // it is the harder job but it only comes round once per rotation. The tie
    // with second place is the ceiling the two constants set between them —
    // move either one and this is what says the balance changed.
    expect(pointsOf(all, 'elena')!).toBeLessThan(pointsOf(all, 'ana')!);
    expect(pointsOf(all, 'elena')!).toBe(pointsOf(all, 'bruno')!);
    expect(pointsOf(all, 'elena')!).toBeGreaterThan(pointsOf(all, 'carla')!);
  });

  it('stops paying a position bonus past the places the contract lists', () => {
    const rows = scoreTurn(
      turn({
        guesses: [
          { playerId: 'ana', timePercent: 50, position: 1 },
          { playerId: 'bruno', timePercent: 50, position: 2 },
          { playerId: 'carla', timePercent: 50, position: 3 },
          { playerId: 'dani', timePercent: 50, position: 4 },
        ],
      }),
    );
    expect(rows.find((r) => r.playerId === 'dani')?.positionBonus).toBe(0);
    expect(pointsOf(rows, 'dani')).toBe(50);
  });

  it('survives a room with nobody left to guess', () => {
    const rows = scoreTurn({ drawerId: 'elena', players: [players[0]], guesses: [] });
    expect(pointsOf(rows, 'elena')).toBe(0);
  });
});

describe('computeStandings', () => {
  const player = (name: string, total: number, guessed = 0, secondsUsed = 0) => ({
    playerId: name,
    name,
    total,
    guessed,
    secondsUsed,
  });

  it('ranks by total, highest first', () => {
    const table = computeStandings([player('a', 10), player('b', 30), player('c', 20)]);
    expect(table.map((row) => row.name)).toEqual(['b', 'c', 'a']);
    expect(table.map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it('breaks a tie on turns guessed, then on seconds spent', () => {
    const table = computeStandings([
      player('slow', 50, 3, 120),
      player('quick', 50, 3, 40),
      player('lucky', 50, 2, 10),
    ]);
    expect(table.map((row) => row.name)).toEqual(['quick', 'slow', 'lucky']);
  });

  it('gives a true tie the same rank and skips the next', () => {
    const table = computeStandings([
      player('a', 50, 2, 30),
      player('b', 50, 2, 30),
      player('c', 10),
    ]);
    expect(table.map((row) => row.rank)).toEqual([1, 1, 3]);
  });
});
