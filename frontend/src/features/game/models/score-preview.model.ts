import { SCORING, type PlayerTurnState } from '@/shared/contract';

/**
 * What this turn is worth **right now**, for the person looking at it.
 *
 * It mirrors `backend/src/modules/game/domain/services/scoring.ts` exactly, and
 * it is a preview and nothing more: the server scores the turn when it ends and
 * that number is the one that counts. Recomputing it here is what makes the two
 * scoring rules legible while they are still in play — a drawer who cannot see
 * their average climb has no way to learn that clarity is the whole job.
 */
export interface GuesserPreview {
  kind: 'guesser';
  /** Percent of the turn still on the clock, which is also the points it pays. */
  timePercent: number;
  /** Where I would land if I got it now. */
  position: number;
  positionBonus: number;
  total: number;
}

export interface DrawerPreview {
  kind: 'drawer';
  guessed: number;
  /** Everybody who could guess: the divisor, whether or not they get there. */
  couldGuess: number;
  /** The room's average so far — the drawer's pay if the turn ended now. */
  average: number;
  allGuessedBonus: number;
  total: number;
}

export type ScorePreview = GuesserPreview | DrawerPreview;

/** The clock, as points. One point per one percent still left. */
export const timePercentLeft = (secondsLeft: number, drawSeconds: number): number =>
  drawSeconds <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((secondsLeft / drawSeconds) * 100)));

const bonusFor = (position: number): number => SCORING.positionBonus[position - 1] ?? 0;

/**
 * The clock half of what a guesser was paid, recovered from their total.
 *
 * `points` arrives already summed — it is what `player:guessed` broadcast — and
 * the drawer's average is built from the clock half alone, so the bonus has to
 * come back off. Subtracting is safe because the position it was granted for
 * travels in the same row.
 */
const timeHalfOf = (player: PlayerTurnState): number =>
  Math.max(0, player.points - bonusFor(player.position ?? 0));

export const guesserPreview = (
  secondsLeft: number,
  drawSeconds: number,
  players: readonly PlayerTurnState[],
): GuesserPreview => {
  const position = players.filter((player) => player.guessed).length + 1;
  const timePercent = timePercentLeft(secondsLeft, drawSeconds);
  const positionBonus = bonusFor(position);
  return { kind: 'guesser', timePercent, position, positionBonus, total: timePercent + positionBonus };
};

/**
 * A guesser who already has the word. Nothing here is a preview any more — the
 * clock stopped for them the moment they got it, and the row the server sent
 * back is the score. It is shown in the same shape so the card does not have to
 * know the difference.
 */
export const settledGuesserPreview = (player: PlayerTurnState): GuesserPreview => {
  const position = player.position ?? 0;
  const positionBonus = bonusFor(position);
  return {
    kind: 'guesser',
    timePercent: timeHalfOf(player),
    position,
    positionBonus,
    total: player.points,
  };
};

export const drawerPreview = (
  drawerId: string,
  players: readonly PlayerTurnState[],
): DrawerPreview => {
  const guessers = players.filter((player) => player.playerId !== drawerId);
  const done = guessers.filter((player) => player.guessed);
  const couldGuess = guessers.length;

  // Everybody who could guess is the divisor, not everybody who did: a player
  // who never gets there counts as a zero and drags the average down. That one
  // choice is the entire design of the game.
  const average =
    couldGuess === 0
      ? 0
      : Math.round(done.reduce((sum, player) => sum + timeHalfOf(player), 0) / couldGuess);

  const allGuessedBonus =
    couldGuess > 0 && done.length === couldGuess ? SCORING.allGuessedBonus : 0;

  return {
    kind: 'drawer',
    guessed: done.length,
    couldGuess,
    average,
    allGuessedBonus,
    total: average + allGuessedBonus,
  };
};
