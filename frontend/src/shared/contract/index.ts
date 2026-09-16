/**
 * SketchRush socket contract.
 *
 * OWNER: backend. The frontend keeps a byte-identical copy at
 * `frontend/src/shared/contract/index.ts`, refreshed with
 * `node scripts/sync-contract.mjs` from the repo root. Never edit the copy.
 *
 * Rules and scoring are documented in `docs/context/`; the numbers below are
 * the single place they are encoded.
 */

export const CONTRACT_VERSION = 1;

export type Language = 'es' | 'en';

/** How the room types its guesses. See docs/context/02-game-rules.md. */
export type GuessMode = 'box' | 'chat';

export type RoomStatus = 'lobby' | 'choosing' | 'drawing' | 'between-turns' | 'finished';

/**
 * The six buckets the word bank is split into. Each turn offers three of them,
 * one word from each, so the drawer's choice is between different *kinds* of
 * thing rather than three arbitrary nouns.
 *
 * Deliberately no "difficult" bucket, the way Pictionary has one: there the
 * category is a die roll, here the drawer picks, and the drawer is paid the
 * room's average. A hard word would be pure downside and nobody would ever take
 * it. These six are content, not difficulty — none is strictly worse.
 *
 * `characters` is anybody who could be a person in the picture: jobs, royalty,
 * pirates, and the humanoid half of folklore. Those live here rather than under
 * `animals` — a mermaid is drawn as a person, a dragon is not.
 */
export type WordCategory =
  | 'animals'
  | 'characters'
  | 'food'
  | 'objects'
  | 'places'
  | 'actions';

export const WORD_CATEGORIES: readonly WordCategory[] = [
  'animals',
  'characters',
  'food',
  'objects',
  'places',
  'actions',
];

/** One of the drawer's three options, and which bucket it came from. */
export interface WordChoice {
  word: string;
  category: WordCategory;
}

export type Emote =
  | 'love'
  | 'wink'
  | 'tease'
  | 'mindblown'
  | 'shock'
  | 'explode'
  | 'oops'
  | 'whoa'
  | 'ez'
  | 'done'
  | 'clutch'
  | 'gg'
  | 'lol'
  | 'grumpy'
  | 'thumbs'
  | 'luck'
  | 'point'
  | 'shrug'
  | 'ok'
  | 'shh';

/** Picker order: the 5x4 grid reads row by row in this order. */
export const EMOTES: readonly Emote[] = [
  'love',
  'wink',
  'tease',
  'mindblown',
  'shock',
  'explode',
  'oops',
  'whoa',
  'ez',
  'done',
  'clutch',
  'gg',
  'lol',
  'grumpy',
  'thumbs',
  'luck',
  'point',
  'shrug',
  'ok',
  'shh',
];

/**
 * The drawing swatches, sent over the wire as an index into this array so a
 * stroke costs a number rather than a string and every screen paints the same
 * colour. Index 0 is the default brush.
 */
export const PALETTE: readonly string[] = [
  '#1c1a17', // ink
  '#8f8980', // grey
  '#ffffff', // white / paper
  '#b33a2b', // red
  '#e5733a', // orange
  '#e5b537', // yellow
  '#3fa66b', // green
  '#0e7490', // accent
  '#3b5bdb', // blue
  '#6c4cf1', // violet
  '#c2410c', // brown
  '#d946a6', // pink
];

export const BRUSH_SIZES: readonly number[] = [4, 10, 20, 36];

export const ROOM_LIMITS = {
  minPlayers: 2,
  maxPlayers: 10,
  drawSecondsOptions: [40, 60, 80, 100] as const,
  minDrawSeconds: 40,
  maxDrawSeconds: 100,
  roundsOptions: [1, 2, 3, 5] as const,
  minRounds: 1,
  maxRounds: 5,
  hintLettersOptions: [0, 1, 2] as const,
  maxHintLetters: 2,
  nameMinLength: 1,
  nameMaxLength: 16,
  /** How many words the drawer chooses between, and how long they have. */
  wordChoices: 3,
  chooseSeconds: 10,
  /** The reveal between one turn and the next. */
  betweenTurnsSeconds: 8,
  guessMaxLength: 32,
  /**
   * Most points one `draw:stroke` message may carry. The drawer flushes the
   * points collected since the last flush roughly every 50 ms, so a hand never
   * comes close; the cap is there so a crafted message cannot be a megabyte.
   */
  strokeChunkPoints: 256,
  /** Emote burst limit: more than 8 sends inside 3 s pauses the player for 5 s. */
  emoteBurstLimit: 8,
  emoteBurstWindowSeconds: 3,
  emotePauseSeconds: 5,
} as const;

/** docs/context/03-scoring-system.md — the only two numbers the game has. */
export const SCORING = {
  /** To the 1st, 2nd and 3rd player to guess. Nothing from fourth on. */
  positionBonus: [20, 15, 10] as const,
  /** To the drawer, when every other player guessed. */
  allGuessedBonus: 15,
} as const;

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/**
 * Canvas coordinates, normalised to 0..1 on both axes. Never pixels: the drawer
 * and the watchers are on different screens, and a drawing has to land in the
 * same place on all of them.
 */
export interface Point {
  x: number;
  y: number;
}

export type StrokeTool = 'brush' | 'eraser';

/**
 * One entry of the turn's canvas. The server keeps the list so a reload or a
 * late join replays the drawing instead of landing on a blank sheet; it is
 * dropped when the turn ends.
 *
 * A stroke arrives in chunks under one `id` — points are appended to the entry
 * that already carries it, so a long line is one entry however many messages
 * built it.
 */
export type DrawOp =
  | { kind: 'stroke'; id: number; tool: StrokeTool; color: number; size: number; points: Point[] }
  | { kind: 'fill'; id: number; color: number; at: Point }
  | { kind: 'clear'; id: number };

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export interface RoomSettings {
  language: Language;
  drawSeconds: number;
  /** A round is one full rotation: everybody draws once. */
  rounds: number;
  capacity: number;
  guessMode: GuessMode;
  /** How many letters of the word are revealed as the turn runs. */
  hintLetters: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
}

export interface LobbyState {
  code: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: PlayerPublic[];
}

/** What everybody sees about a player during a turn. */
export interface PlayerTurnState {
  playerId: string;
  guessed: boolean;
  /** 1-based order of guessing; null until they do. */
  position: number | null;
  /** Points this turn, fixed at the moment they guessed. 0 until then. */
  points: number;
}

export interface TurnInfo {
  /** 1-based across the whole game. */
  turn: number;
  /** Which rotation this turn belongs to. */
  round: number;
  totalRounds: number;
  drawerId: string;
  drawSeconds: number;
  /** Epoch ms the drawing phase began; 0 while the drawer is still choosing. */
  startedAt: number;
  /**
   * The word as everybody but the drawer sees it: one entry per letter, `null`
   * where it is still hidden. Spaces come through as `' '`.
   */
  masked: (string | null)[];
}

export interface TurnState extends TurnInfo {
  /** The answer. Only ever addressed to the drawer; `null` for everybody else. */
  word: string | null;
  /** Everything drawn so far this turn, so a reload repaints it. */
  canvas: DrawOp[];
  players: PlayerTurnState[];
}

export interface TurnBreakdownRow {
  playerId: string;
  name: string;
  /** The drawer's row; their points come from the room's average. */
  drawer: boolean;
  guessed: boolean;
  /** Percent of the turn still on the clock when they guessed; null otherwise. */
  timePercent: number | null;
  timePoints: number;
  position: number | null;
  positionBonus: number;
  /** Only ever non-zero on the drawer's row. */
  allGuessedBonus: number;
  turnPoints: number;
}

export interface Standing {
  playerId: string;
  name: string;
  total: number;
  /** Tie-break 1: turns this player guessed. */
  guessed: number;
  /** Tie-break 2: total seconds spent before guessing. */
  secondsUsed: number;
  rank: number;
}

export interface TurnEndPayload {
  turn: number;
  totalTurns: number;
  word: string;
  breakdown: TurnBreakdownRow[];
  standings: Standing[];
  /** Seconds until the next turn starts; 0 when the game ended. */
  nextTurnIn: number;
}

export interface GameEndPayload {
  standings: Standing[];
  rounds: number;
}

export interface FullState {
  lobby: LobbyState;
  turn: TurnState | null;
  lastTurnEnd: TurnEndPayload | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'room_not_found'
  | 'room_full'
  | 'server_full'
  | 'game_in_progress'
  | 'name_taken'
  | 'invalid_payload'
  | 'not_host'
  | 'not_enough_players'
  | 'not_in_turn'
  | 'not_drawer'
  | 'not_choosing'
  | 'already_guessed'
  | 'cooldown'
  | 'not_in_room'
  | 'already_in_room'
  | 'session_expired'
  | 'internal';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export type Ack<T> = ({ ok: true } & T) | ({ ok: false } & ErrorPayload);
/** Ack of events that return no data. */
export type EmptyAck = { ok: true } | ({ ok: false } & ErrorPayload);

// ---------------------------------------------------------------------------
// Client -> server
// ---------------------------------------------------------------------------

export interface CreateRoomPayload {
  name: string;
  settings: RoomSettings;
}

export interface JoinRoomPayload {
  roomCode: string;
  name: string;
}

export interface RejoinPayload {
  roomCode: string;
  playerId: string;
  /** Secret handed out on create/join; proves ownership of the playerId. */
  token: string;
}

/** Host-only, lobby-only edit of the room settings. */
export interface UpdateSettingsPayload {
  settings: RoomSettings;
}

/** Drawer only, choosing phase only: which of `ROOM_LIMITS.wordChoices` to draw. */
export interface ChooseWordPayload {
  index: number;
}

/** Drawer only, drawing phase only. One chunk of an in-progress stroke. */
export interface StrokePayload {
  id: number;
  tool: StrokeTool;
  color: number;
  size: number;
  points: Point[];
}

export interface FillPayload {
  color: number;
  at: Point;
}

export interface GuessPayload {
  text: string;
}

export interface ReactionPayload {
  emote: Emote;
}

export interface SessionAck {
  roomCode: string;
  playerId: string;
  token: string;
  state: FullState;
}

/** What the guesser alone is told about their own attempt. */
export interface GuessAck {
  correct: boolean;
  /** One letter away from the answer. Never true together with `correct`. */
  close: boolean;
  /** Their place and points, set only when `correct`. */
  position: number | null;
  points: number;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: (r: Ack<SessionAck>) => void) => void;
  'room:join': (payload: JoinRoomPayload, ack: (r: Ack<SessionAck>) => void) => void;
  'room:rejoin': (payload: RejoinPayload, ack: (r: Ack<SessionAck>) => void) => void;
  'room:leave': (ack?: (r: EmptyAck) => void) => void;
  'room:ready': (payload: { ready: boolean }, ack?: (r: EmptyAck) => void) => void;
  'room:start': (ack?: (r: EmptyAck) => void) => void;
  /** Host-only, finished-game only: reset the room to a fresh lobby and play again. */
  'room:restart': (ack?: (r: EmptyAck) => void) => void;
  'room:update-settings': (payload: UpdateSettingsPayload, ack?: (r: EmptyAck) => void) => void;
  'turn:choose': (payload: ChooseWordPayload, ack?: (r: EmptyAck) => void) => void;
  'draw:stroke': (payload: StrokePayload, ack?: (r: EmptyAck) => void) => void;
  'draw:fill': (payload: FillPayload, ack?: (r: EmptyAck) => void) => void;
  'draw:undo': (ack?: (r: EmptyAck) => void) => void;
  'draw:clear': (ack?: (r: EmptyAck) => void) => void;
  'game:guess': (payload: GuessPayload, ack: (r: Ack<GuessAck>) => void) => void;
  'reaction:send': (payload: ReactionPayload, ack?: (r: EmptyAck) => void) => void;
}

// ---------------------------------------------------------------------------
// Server -> client
// ---------------------------------------------------------------------------

/** Drawer only. Nobody else is ever told what the options were. */
export interface WordChoicesPayload {
  /** `ROOM_LIMITS.wordChoices` options, each from a different category. */
  choices: WordChoice[];
  /** Epoch ms the choice expires and the first option is taken. */
  deadline: number;
}

export interface GuessedPayload {
  playerId: string;
  position: number;
  points: number;
}

/** Only in a `chat` room. A `box` room never emits this. */
export interface ChatMessagePayload {
  playerId: string;
  text: string;
}

export interface HintPayload {
  /** Same shape as `TurnInfo.masked`, with one more letter filled in. */
  masked: (string | null)[];
}

/** A player gave up their seat for good (`room:leave`), not a disconnection. */
export interface PlayerLeftPayload {
  playerId: string;
  name: string;
  /** Set when the leaver was the host and the room promoted somebody else. */
  newHostId: string | null;
}

/** The same player rejoined from another socket; this one is no longer bound. */
export interface SessionReplacedPayload {
  roomCode: string;
}

export interface ServerToClientEvents {
  'lobby:update': (lobby: LobbyState) => void;
  /** Addressed per player: the drawer's copy carries `word`, nobody else's does. */
  'turn:start': (turn: TurnState) => void;
  'turn:choices': (payload: WordChoicesPayload) => void;
  'turn:hint': (payload: HintPayload) => void;
  'turn:end': (payload: TurnEndPayload) => void;
  'draw:stroke': (payload: StrokePayload) => void;
  'draw:fill': (payload: FillPayload) => void;
  'draw:undo': () => void;
  'draw:clear': () => void;
  'player:guessed': (payload: GuessedPayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'player:left': (payload: PlayerLeftPayload) => void;
  'game:end': (payload: GameEndPayload) => void;
  'reaction:show': (payload: { playerId: string; emote: Emote }) => void;
  'session:replaced': (payload: SessionReplacedPayload) => void;
  error: (payload: ErrorPayload) => void;
}
