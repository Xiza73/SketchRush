import { Game } from './game.entity';

const order = ['a', 'b', 'c'];

describe('Game · the rotation', () => {
  it('shifts the order one seat every round', () => {
    const game = new Game('ABCD', order, 3);
    const drawn = Array.from({ length: 9 }, () => game.takeNextDrawer(order));
    // a b c, then b c a, then c a b: nobody owns the opening turn of a round,
    // and nobody owns the last word of the game.
    expect(drawn).toEqual(['a', 'b', 'c', 'b', 'c', 'a', 'c', 'a', 'b']);
  });

  it('still gives every seat exactly one turn per round', () => {
    const game = new Game('ABCD', order, 3);
    const drawn = Array.from({ length: 9 }, () => game.takeNextDrawer(order));
    for (const round of [drawn.slice(0, 3), drawn.slice(3, 6), drawn.slice(6, 9)]) {
      expect([...round].sort()).toEqual(['a', 'b', 'c']);
    }
  });

  it('skips a seat that left without losing its place in the order', () => {
    const game = new Game('ABCD', order, 2);
    expect(game.takeNextDrawer(order)).toBe('a');
    // b walked out between turns.
    expect(game.takeNextDrawer(['a', 'c'])).toBe('c');
  });

  it('answers null when nobody in the order is still seated', () => {
    const game = new Game('ABCD', order, 2);
    expect(game.takeNextDrawer([])).toBeNull();
  });

  it('gives a one-player room that player, over and over', () => {
    const game = new Game('ABCD', order, 2);
    expect(game.takeNextDrawer(['b'])).toBe('b');
    expect(game.takeNextDrawer(['b'])).toBe('b');
  });
});

describe('Game · how long it runs', () => {
  it('is one turn per seat per round', () => {
    expect(new Game('ABCD', order, 3).totalTurns).toBe(9);
  });

  it('counts the round from the turns actually played', () => {
    const game = new Game('ABCD', order, 3);
    expect(game.round).toBe(1);
    game.turnNumber = 3;
    expect(game.round).toBe(1);
    game.turnNumber = 4;
    expect(game.round).toBe(2);
    game.turnNumber = 9;
    expect(game.round).toBe(3);
  });

  it('is over once every seat has drawn in every round', () => {
    const game = new Game('ABCD', order, 2);
    game.turnNumber = 5;
    expect(game.isOver()).toBe(false);
    game.turnNumber = 6;
    expect(game.isOver()).toBe(true);
  });
});
