import type { GameEndPayload, Standing, TurnBreakdownRow, TurnEndPayload } from '@/shared/contract';

export interface BreakdownRowViewModel extends TurnBreakdownRow {
  rank: number;
  isMe: boolean;
}

export interface StandingViewModel extends Standing {
  isMe: boolean;
  /** Bar width relative to the leader, 0–100. */
  barPercent: number;
}

export interface TurnResultsViewModel {
  turn: number;
  totalTurns: number;
  /** The round this belonged to, which is what the room actually chose. */
  round: number;
  totalRounds: number;
  turnInRound: number;
  turnsPerRound: number;
  word: string;
  rows: BreakdownRowViewModel[];
  standings: StandingViewModel[];
  guessedCount: number;
  /**
   * Everybody who *could* have guessed — the table minus the drawer. It is the
   * divisor the drawer is paid on, so it is also the only honest denominator
   * for "N of M got it": the drawer never had a chance to.
   */
  guesserCount: number;
  playerCount: number;
  drawer: BreakdownRowViewModel | null;
  first: BreakdownRowViewModel | null;
  myRow: BreakdownRowViewModel | null;
  myStanding: StandingViewModel | null;
  isFinal: boolean;
  /**
   * Set when the top two finished on the same points and a tie-break decided
   * first place. Two identical totals with one winner looks arbitrary unless
   * the screen says which rule separated them.
   */
  decidedBy: { total: number; rule: 'guessed' | 'seconds' } | null;
}

/** Which rule actually separated the top two, if their totals were level. */
const tieBreakBetweenTopTwo = (
  standings: readonly StandingViewModel[],
): TurnResultsViewModel['decidedBy'] => {
  const [first, second] = standings;
  if (!first || !second || first.total !== second.total) return null;
  if (first.guessed !== second.guessed) return { total: first.total, rule: 'guessed' };
  if (first.secondsUsed !== second.secondsUsed) return { total: first.total, rule: 'seconds' };
  // Level on every key: they share rank 1 and nothing was broken.
  return null;
};

/**
 * The drawer's row goes first — the turn was theirs, and their score is the one
 * that explains everybody else's. Then whoever guessed, in the order they did,
 * then whoever did not.
 */
const byTurnResult = (first: TurnBreakdownRow, second: TurnBreakdownRow) => {
  if (first.drawer !== second.drawer) return first.drawer ? -1 : 1;
  if (first.guessed !== second.guessed) return first.guessed ? -1 : 1;
  if (first.guessed && second.guessed) return (first.position ?? 99) - (second.position ?? 99);
  return second.turnPoints - first.turnPoints;
};

export const toStandingViewModels = (
  standings: Standing[],
  myId: string | null,
): StandingViewModel[] => {
  const sorted = [...standings].sort((first, second) => first.rank - second.rank);
  const top = Math.max(1, ...sorted.map((standing) => standing.total));
  return sorted.map((standing) => ({
    ...standing,
    isMe: standing.playerId === myId,
    barPercent: Math.max(0, Math.round((standing.total / top) * 100)),
  }));
};

export const toTurnResultsViewModel = (
  payload: TurnEndPayload,
  myId: string | null,
  gameEnd: GameEndPayload | null,
): TurnResultsViewModel => {
  const rows = [...payload.breakdown]
    .sort(byTurnResult)
    .map((row, index) => ({ ...row, rank: index + 1, isMe: row.playerId === myId }));
  const standings = toStandingViewModels(gameEnd?.standings ?? payload.standings, myId);
  return {
    turn: payload.turn,
    totalTurns: payload.totalTurns,
    round: payload.round,
    totalRounds: payload.totalRounds,
    turnInRound: payload.turnInRound,
    turnsPerRound: payload.turnsPerRound,
    word: payload.word.toUpperCase(),
    rows,
    standings,
    guessedCount: rows.filter((row) => row.guessed).length,
    guesserCount: rows.filter((row) => !row.drawer).length,
    playerCount: rows.length,
    drawer: rows.find((row) => row.drawer) ?? null,
    first: rows.find((row) => row.position === 1) ?? null,
    myRow: rows.find((row) => row.isMe) ?? null,
    myStanding: standings.find((standing) => standing.isMe) ?? null,
    isFinal: gameEnd !== null || payload.nextTurnIn === 0 || payload.turn >= payload.totalTurns,
    decidedBy: tieBreakBetweenTopTwo(standings),
  };
};
