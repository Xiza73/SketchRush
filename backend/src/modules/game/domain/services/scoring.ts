import { SCORING, type Standing, type TurnBreakdownRow } from '@shared/contract';

export interface TurnPlayer {
  id: string;
  name: string;
}

export interface TurnGuess {
  playerId: string;
  /** Percent of the turn still on the clock when they got it. */
  timePercent: number;
  /** 1-based order of guessing. */
  position: number;
}

export interface TurnScoreInput {
  drawerId: string;
  /** Everybody still seated for this turn, the drawer included. */
  players: readonly TurnPlayer[];
  guesses: readonly TurnGuess[];
}

/**
 * docs/context/03-scoring-system.md, in code. Two constants and nothing else.
 *
 * A guesser is paid the clock they had left plus a bonus for the first three
 * places. The drawer is paid **the room's average**: the divisor is everybody
 * who *could* have guessed, so a player who never gets there counts as a zero
 * and drags it down. That is the whole design — the only lever a drawer has is
 * being understood, quickly, by as many people as possible.
 *
 * There is no floor. The drawer picked the word out of three, so a turn nobody
 * guesses is worth zero and that is theirs. Take word choice away and this rule
 * has to change with it.
 */
export const scoreTurn = (input: TurnScoreInput): TurnBreakdownRow[] => {
  const byPlayer = new Map(input.guesses.map((guess) => [guess.playerId, guess]));
  const couldGuess = input.players.length - 1;
  const everybodyGuessed = couldGuess > 0 && input.guesses.length === couldGuess;

  const drawerPoints = () => {
    if (couldGuess <= 0) return { time: 0, all: 0 };
    const total = input.guesses.reduce((sum, guess) => sum + guess.timePercent, 0);
    return {
      time: Math.round(total / couldGuess),
      all: everybodyGuessed ? SCORING.allGuessedBonus : 0,
    };
  };

  return input.players.map((player): TurnBreakdownRow => {
    if (player.id === input.drawerId) {
      const { time, all } = drawerPoints();
      return {
        playerId: player.id,
        name: player.name,
        drawer: true,
        guessed: false,
        timePercent: null,
        timePoints: time,
        position: null,
        positionBonus: 0,
        allGuessedBonus: all,
        turnPoints: time + all,
      };
    }

    const guess = byPlayer.get(player.id);
    if (!guess) {
      return {
        playerId: player.id,
        name: player.name,
        drawer: false,
        guessed: false,
        timePercent: null,
        timePoints: 0,
        position: null,
        positionBonus: 0,
        allGuessedBonus: 0,
        turnPoints: 0,
      };
    }

    const positionBonus = SCORING.positionBonus[guess.position - 1] ?? 0;
    return {
      playerId: player.id,
      name: player.name,
      drawer: false,
      guessed: true,
      timePercent: guess.timePercent,
      timePoints: guess.timePercent,
      position: guess.position,
      positionBonus,
      allGuessedBonus: 0,
      turnPoints: guess.timePercent + positionBonus,
    };
  });
};

export interface StandingInput {
  playerId: string;
  name: string;
  total: number;
  guessed: number;
  secondsUsed: number;
}

/**
 * Tie-breaks, in order: more turns guessed, then fewer seconds spent guessing.
 * Ranks are competition style (1, 1, 3) — the multi-key sort puts true ties
 * next to each other, so comparing to the row above is enough.
 */
export const computeStandings = (players: readonly StandingInput[]): Standing[] => {
  const sorted = [...players].sort((first, second) => {
    if (first.total !== second.total) return second.total - first.total;
    if (first.guessed !== second.guessed) return second.guessed - first.guessed;
    if (first.secondsUsed !== second.secondsUsed) return first.secondsUsed - second.secondsUsed;
    return first.name.localeCompare(second.name);
  });

  let rank = 0;
  return sorted.map((player, index) => {
    const previous = sorted[index - 1];
    const tied =
      previous !== undefined &&
      previous.total === player.total &&
      previous.guessed === player.guessed &&
      previous.secondsUsed === player.secondsUsed;
    if (!tied) rank = index + 1;
    return { ...player, rank };
  });
};
