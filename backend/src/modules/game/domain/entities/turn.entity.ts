import type { DrawOp, Point, StrokeTool, WordChoice } from '@shared/contract';
import {
  hintCandidates,
  hintCount,
  hintDueAt,
  hintSchedule,
  maskWord,
} from '../services/word-mask';

export type TurnPhase = 'choosing' | 'drawing' | 'ended';

/**
 * How many points one turn's canvas may hold before further drawing is dropped.
 * Roughly ten times what a hand produces in the longest turn the settings allow.
 */
export const CANVAS_POINT_LIMIT = 100_000;

export interface TurnGuessRecord {
  playerId: string;
  /** Percent of the turn still on the clock when they got it. */
  timePercent: number;
  /** 1-based order of guessing. */
  position: number;
  /** Seconds they spent before getting it; a standings tie-break. */
  secondsUsed: number;
}

export interface TurnProps {
  turn: number;
  round: number;
  drawerId: string;
  drawSeconds: number;
  hints: boolean;
}

/**
 * One turn: a drawer, a word, a canvas and whoever has guessed so far.
 *
 * The clock is an **absolute deadline**, never a counter that ticks down. It is
 * set once when drawing starts and everything else is derived from it — the
 * same decision WordRush runs on, and the reason two numbers can never drift
 * apart here.
 */
export class Turn {
  readonly turn: number;
  readonly round: number;
  readonly drawerId: string;
  readonly drawSeconds: number;
  readonly hints: boolean;

  phase: TurnPhase = 'choosing';
  /** The three options offered, each from its own category; drawer only. */
  choices: WordChoice[] = [];
  /** Epoch ms at which the first choice is taken for them. */
  chooseDeadlineAt = 0;
  word: string | null = null;
  startedAt = 0;
  /** Epoch ms the drawing time runs out. 0 while still choosing. */
  deadlineAt = 0;
  /** Character positions already revealed as hints. */
  readonly revealed: number[] = [];
  /**
   * Seconds from the start at which each remaining hint is due, soonest first.
   *
   * Offsets rather than epochs because the moment is not fixed when drawing
   * begins: it moves forward as the room guesses, so it has to be recomputed
   * against the room every time it is asked, not baked in once.
   */
  private pendingHints: number[] = [];
  readonly canvas: DrawOp[] = [];
  /**
   * Operations undo has taken off the canvas, newest last. Redo pops from here;
   * drawing anything new empties it. They still count against the point cap
   * only while they are on the canvas, never while they sit here.
   */
  private readonly undone: DrawOp[] = [];
  private nextOpId = 1;
  /** Points held in `canvas`, kept as a running total so the cap is cheap. */
  private points = 0;
  readonly guesses: TurnGuessRecord[] = [];

  constructor(props: TurnProps) {
    this.turn = props.turn;
    this.round = props.round;
    this.drawerId = props.drawerId;
    this.drawSeconds = props.drawSeconds;
    this.hints = props.hints;
  }

  offer(choices: WordChoice[], now: number, chooseSeconds: number): void {
    this.choices = choices;
    this.chooseDeadlineAt = now + chooseSeconds * 1000;
  }

  /** The drawer picked (or ran out of time and took the first). */
  begin(word: string, now: number): void {
    this.word = word;
    this.phase = 'drawing';
    this.startedAt = now;
    this.deadlineAt = now + this.drawSeconds * 1000;
    // The word decides how many; the room decides when.
    this.pendingHints = this.hints ? hintSchedule(hintCount(word), this.drawSeconds) : [];
  }

  end(): void {
    this.phase = 'ended';
  }

  secondsLeft(now: number): number {
    if (this.phase !== 'drawing') return 0;
    return Math.max(0, (this.deadlineAt - now) / 1000);
  }

  /** What a guess landing right now is worth, before any bonus. */
  timePercent(now: number): number {
    if (this.drawSeconds <= 0) return 0;
    return Math.max(0, Math.round((this.secondsLeft(now) / this.drawSeconds) * 100));
  }

  isOutOfTime(now: number): boolean {
    return this.phase === 'drawing' && this.deadlineAt <= now;
  }

  hasGuessed(playerId: string): boolean {
    return this.guesses.some((guess) => guess.playerId === playerId);
  }

  recordGuess(playerId: string, now: number): TurnGuessRecord {
    const record: TurnGuessRecord = {
      playerId,
      timePercent: this.timePercent(now),
      position: this.guesses.length + 1,
      secondsUsed: Math.max(0, Math.round((now - this.startedAt) / 1000)),
    };
    this.guesses.push(record);
    return record;
  }

  /**
   * Everybody who could still guess, has. The drawer is not one of them.
   *
   * It takes the seats rather than a count because a player who guessed and
   * then left keeps their record here: counting rows against the current head
   * count would close the turn on somebody who is still typing.
   */
  everybodyGuessed(seatedIds: readonly string[]): boolean {
    const guessers = seatedIds.filter((id) => id !== this.drawerId);
    return guessers.length > 0 && guessers.every((id) => this.hasGuessed(id));
  }

  masked(): (string | null)[] {
    return this.word ? maskWord(this.word, this.revealed) : [];
  }

  /**
   * How much of the room already has the word. The drawer is not counted on
   * either side of the fraction: they are not waiting on a hint and they were
   * never going to guess.
   */
  guessedShare(seatedIds: readonly string[]): number {
    const guessers = seatedIds.filter((id) => id !== this.drawerId);
    if (guessers.length === 0) return 0;
    return guessers.filter((id) => this.hasGuessed(id)).length / guessers.length;
  }

  /**
   * Reveals one letter per hint whose moment has passed, and reports whether
   * anything changed. Falling behind (a slow tick, a paused process) releases
   * every hint that came due rather than dropping them.
   *
   * The moment is read fresh against `guessedShare` every pass, so a hint the
   * schedule had parked at sixty seconds can come due at twenty once most of
   * the room is home.
   */
  releaseDueHints(now: number, guessedShare = 0): boolean {
    if (this.phase !== 'drawing' || !this.word) return false;
    const elapsed = (now - this.startedAt) / 1000;
    let changed = false;
    while (
      this.pendingHints.length > 0 &&
      hintDueAt(this.pendingHints[0] ?? Infinity, guessedShare) <= elapsed
    ) {
      this.pendingHints.shift();
      const candidates = hintCandidates(this.word, this.revealed);
      if (candidates.length === 0) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      if (pick === undefined) break;
      this.revealed.push(pick);
      changed = true;
    }
    return changed;
  }

  // ------------------------------------------------------------- the canvas

  /**
   * A stroke arrives in chunks under one id: points are appended to the entry
   * that already carries it, so a long line stays one entry however many
   * messages built it.
   *
   * Returns false once the buffer is full. A hand drawing for a hundred seconds
   * does not come near `CANVAS_POINT_LIMIT`; a client sending as fast as the
   * socket allows does, and the buffer is replayed to every late joiner.
   */
  addStroke(id: number, tool: StrokeTool, color: number, size: number, points: Point[]): boolean {
    if (this.points + points.length > CANVAS_POINT_LIMIT) return false;
    this.dropUndone();
    this.points += points.length;
    const last = this.canvas[this.canvas.length - 1];
    if (last?.kind === 'stroke' && last.id === id) {
      last.points.push(...points);
      return true;
    }
    this.canvas.push({ kind: 'stroke', id, tool, color, size, points: [...points] });
    this.nextOpId = Math.max(this.nextOpId, id + 1);
    return true;
  }

  addFill(color: number, at: Point): boolean {
    if (this.points + 1 > CANVAS_POINT_LIMIT) return false;
    this.dropUndone();
    this.points += 1;
    this.canvas.push({ kind: 'fill', id: this.nextOpId++, color, at });
    return true;
  }

  /**
   * Undo drops the last operation, whatever kind it was, and keeps it.
   *
   * Returns false when there was nothing to drop, so the caller does not
   * broadcast a change that did not happen.
   */
  undo(): boolean {
    const dropped = this.canvas.pop();
    if (!dropped) return false;
    this.points -= this.costOf(dropped);
    this.undone.push(dropped);
    return true;
  }

  /**
   * Puts back the last undone operation and returns it, so the caller can tell
   * the room *what* came back rather than making every screen re-fetch the
   * canvas to find out. Null when there was none, or when it no longer fits.
   */
  redo(): DrawOp | null {
    const restored = this.undone.pop();
    if (!restored) return null;
    const cost = this.costOf(restored);
    if (this.points + cost > CANVAS_POINT_LIMIT) return null;
    this.points += cost;
    this.canvas.push(restored);
    return restored;
  }

  /**
   * A cleared canvas is still a canvas: the marker is pushed and **everything
   * before it is kept**, because a clear is an operation like any other and
   * undo has to be able to take it back. The painter already treats the marker
   * as "paint over all of this", so replaying the buffer looks identical to a
   * late joiner; it only costs the bytes of the strokes it covers, which the
   * point cap still counts.
   */
  clear(): void {
    this.dropUndone();
    this.points += 1;
    this.canvas.push({ kind: 'clear', id: this.nextOpId++ });
  }

  private costOf(op: DrawOp): number {
    return op.kind === 'stroke' ? op.points.length : 1;
  }

  /**
   * Drawing something new ends the future that undo was holding on to. Every
   * editor works this way and the alternative — a redo that resurrects a line
   * from before the one you just drew — is nobody's idea of redo.
   */
  private dropUndone(): void {
    this.undone.length = 0;
  }
}
