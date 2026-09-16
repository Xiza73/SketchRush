import { describe, expect, it } from 'vitest';

import type { PlayerTurnState } from '@/shared/contract';

import {
  drawerPreview,
  guesserPreview,
  settledGuesserPreview,
  timePercentLeft,
} from './score-preview.model';

const seat = (
  playerId: string,
  guessed: boolean,
  position: number | null = null,
  points = 0,
): PlayerTurnState => ({ playerId, guessed, position, points });

describe('timePercentLeft', () => {
  it('is one point per one percent still on the clock', () => {
    expect(timePercentLeft(100, 100)).toBe(100);
    expect(timePercentLeft(73, 100)).toBe(73);
    expect(timePercentLeft(0, 100)).toBe(0);
  });

  it('is the share of the turn, not the seconds', () => {
    // The same 20 seconds is worth half a 40 s turn and a fifth of a 100 s one.
    expect(timePercentLeft(20, 40)).toBe(50);
    expect(timePercentLeft(20, 100)).toBe(20);
  });

  it('never leaves 0..100, whatever the clock says', () => {
    expect(timePercentLeft(-5, 60)).toBe(0);
    expect(timePercentLeft(90, 60)).toBe(100);
    expect(timePercentLeft(10, 0)).toBe(0);
  });
});

describe('guesserPreview', () => {
  it('pays the clock plus the bonus for the place I would take', () => {
    const preview = guesserPreview(60, 100, [seat('ana', false), seat('bruno', false)]);
    expect(preview).toMatchObject({ timePercent: 60, position: 1, positionBonus: 20, total: 80 });
  });

  it('moves me down the podium as others get there first', () => {
    const players = [seat('ana', true, 1, 95), seat('bruno', true, 2, 80), seat('caro', false)];
    expect(guesserPreview(40, 100, players)).toMatchObject({
      position: 3,
      positionBonus: 10,
      total: 50,
    });
  });

  it('pays the clock and nothing else from fourth place on', () => {
    const players = [1, 2, 3].map((n) => seat(`p${n}`, true, n, 90));
    const preview = guesserPreview(30, 100, players);
    expect(preview).toMatchObject({ position: 4, positionBonus: 0, total: 30 });
  });
});

describe('settledGuesserPreview', () => {
  it('splits a settled row back into the clock and the bonus that made it', () => {
    // 95 = 75 on the clock + 20 for first place.
    expect(settledGuesserPreview(seat('ana', true, 1, 95))).toMatchObject({
      timePercent: 75,
      position: 1,
      positionBonus: 20,
      total: 95,
    });
  });

  it('reads a fourth place as all clock and no bonus', () => {
    expect(settledGuesserPreview(seat('ana', true, 4, 30))).toMatchObject({
      timePercent: 30,
      positionBonus: 0,
      total: 30,
    });
  });

  it('survives a row the server has not filled in yet', () => {
    // A reload can land between the guess and the snapshot that carries it.
    expect(settledGuesserPreview(seat('ana', true, null, 0))).toMatchObject({
      timePercent: 0,
      total: 0,
    });
  });
});

describe('drawerPreview', () => {
  const drawer = 'elena';

  it('is zero while nobody has worked it out', () => {
    const players = [seat(drawer, false), seat('ana', false), seat('bruno', false)];
    expect(drawerPreview(drawer, players)).toMatchObject({
      guessed: 0,
      couldGuess: 2,
      average: 0,
      total: 0,
    });
  });

  it('divides by everybody who could guess, not by everybody who did', () => {
    // ana got it with 80% of the clock left and took the +20 for first place,
    // so her row reads 100. The average is built from the clock half alone.
    const players = [seat(drawer, false), seat('ana', true, 1, 100), seat('bruno', false)];
    expect(drawerPreview(drawer, players)).toMatchObject({
      guessed: 1,
      couldGuess: 2,
      // 80 from ana, 0 from bruno, over 2 seats.
      average: 40,
      allGuessedBonus: 0,
      total: 40,
    });
  });

  it('adds the bonus only once every seat is home', () => {
    const players = [
      seat(drawer, false),
      seat('ana', true, 1, 100),
      seat('bruno', true, 2, 75),
    ];
    // 80 and 60 on the clock, average 70, plus the all-guessed bonus.
    expect(drawerPreview(drawer, players)).toMatchObject({
      average: 70,
      allGuessedBonus: 15,
      total: 85,
    });
  });

  it('pays nothing in a room where nobody could have guessed', () => {
    expect(drawerPreview(drawer, [seat(drawer, false)])).toMatchObject({
      couldGuess: 0,
      average: 0,
      allGuessedBonus: 0,
      total: 0,
    });
  });
});
