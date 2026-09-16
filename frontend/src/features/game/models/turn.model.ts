import type { DrawOp, PlayerTurnState, TurnState } from '@/shared/contract';

/**
 * One line in the room feed. Both guess modes use it; `box` just says less.
 *
 * `mine` is the exception: it is written locally when I guess and never leaves
 * this browser, so a `box` room still lets me see what I have already tried
 * without the room seeing any of it.
 */
export interface FeedEntry {
  id: number;
  /**
   * `attempt` is the drawer's alone: a `box` room tells them that somebody
   * missed and how near, never what was typed. It is the only company they get
   * in a turn where they have nothing to type themselves.
   */
  kind: 'chat' | 'guessed' | 'word' | 'mine' | 'attempt';
  playerId: string | null;
  text: string;
  /** On `mine` and `attempt`: how the server judged it, for the colour. */
  verdict?: 'correct' | 'close' | 'wrong';
}

export interface TurnViewModel {
  turn: number;
  round: number;
  totalRounds: number;
  drawerId: string;
  drawSeconds: number;
  /** Epoch ms the drawing began; 0 while the drawer is still choosing. */
  startedAt: number;
  /** Epoch ms the turn runs out. 0 while choosing — the clock has not started. */
  deadlineAt: number;
  /** One entry per letter, `null` where still hidden, `' '` for spaces. */
  masked: (string | null)[];
  /** The answer, and only ever for the drawer. */
  word: string | null;
  /** Player ids in drawing order, fixed for the whole game. */
  order: string[];
  players: PlayerTurnState[];
  /** True between `turn:start` and the moment the drawer picks. */
  choosing: boolean;
}

export const toTurnViewModel = (dto: TurnState): TurnViewModel => ({
  turn: dto.turn,
  round: dto.round,
  totalRounds: dto.totalRounds,
  drawerId: dto.drawerId,
  drawSeconds: dto.drawSeconds,
  startedAt: dto.startedAt,
  // Derived once from the server's absolute timestamp, never counted down:
  // two numbers that tick separately are two numbers that drift apart.
  deadlineAt: dto.startedAt === 0 ? 0 : dto.startedAt + dto.drawSeconds * 1000,
  masked: dto.masked,
  word: dto.word,
  order: dto.order,
  players: dto.players,
  choosing: dto.startedAt === 0,
});

/**
 * Appends one operation the way the server's buffer does: chunks of the same
 * stroke share an id and are merged into one entry, so the replayed drawing is
 * the same list of lines however many messages built it.
 */
export const appendOp = (ops: DrawOp[], op: DrawOp): DrawOp[] => {
  const last = ops[ops.length - 1];
  if (op.kind === 'stroke' && last?.kind === 'stroke' && last.id === op.id) {
    const merged: DrawOp = { ...last, points: [...last.points, ...op.points] };
    return [...ops.slice(0, -1), merged];
  }
  return [...ops, op];
};

/** How many letters of the word are still hidden. */
export const hiddenLetters = (masked: (string | null)[]): number =>
  masked.filter((letter) => letter === null).length;
