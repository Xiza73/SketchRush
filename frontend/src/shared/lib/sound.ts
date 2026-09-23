import {
  type Cue,
  createSoundPlayer,
  cueLog,
  FAMILY_CUES,
  type FamilyCue,
} from '@/shared/lib/sound-engine';

/**
 * SketchRush's own cues (docs/context/02-game-rules.md -> Sound). The engine,
 * the voice and the family cues live in `sound-engine.ts`; what is chosen here
 * is what *this* game sounds like.
 *
 * The shape of the set follows the shape of the game: a turn has a drawer who
 * picks, a room that guesses, hints that fall out of the clock, and a verdict
 * per guess that only the guesser hears. There is no `tileReveal` here and no
 * `letterPlaced` — those are WordRush's board, not this one.
 *
 * **Players cannot send sounds.** Every cue is a consequence of something that
 * happened in the game, never something anybody chose to play at somebody else.
 */
export type GameCue =
  | 'turnStarted'
  | 'yourTurnToDraw'
  | 'hintRevealed'
  | 'youGuessed'
  | 'rivalGuessed'
  | 'guessClose'
  | 'guessWrong'
  | 'turnEnded'
  | 'chatMessage';

export type SoundCue = FamilyCue | GameCue;

const GAME_CUES = {
  // The turn is on: three notes up. Every turn, not only the first.
  turnStarted: {
    notes: [
      { frequency: 523.25, at: 0, duration: 0.1, type: 'triangle' },
      { frequency: 659.25, at: 0.08, duration: 0.1, type: 'triangle' },
      { frequency: 880, at: 0.16, duration: 0.22 },
    ],
  },
  // Your three words are on screen and the room is waiting on you: brighter
  // and a little longer, because it is the one cue that asks for an action.
  yourTurnToDraw: {
    notes: [
      { frequency: 659.25, at: 0, duration: 0.09, type: 'triangle' },
      { frequency: 987.77, at: 0.08, duration: 0.09, type: 'triangle' },
      { frequency: 1318.51, at: 0.16, duration: 0.24 },
    ],
  },
  // A letter fell out of the word: one short glide up, the same voice as
  // WordRush's hint, because it is the same idea.
  hintRevealed: {
    notes: [{ frequency: 783.99, to: 1046.5, at: 0, duration: 0.14, gain: 0.7 }],
    group: 'hint',
  },
  // You got it: a short warm arpeggio.
  youGuessed: {
    notes: [
      { frequency: 523.25, at: 0, duration: 0.1, type: 'triangle' },
      { frequency: 659.25, at: 0.07, duration: 0.1, type: 'triangle' },
      { frequency: 783.99, at: 0.14, duration: 0.1, type: 'triangle' },
      { frequency: 1046.5, at: 0.21, duration: 0.26 },
    ],
  },
  // Somebody else got it. Two notes, down: it is news, not a defeat — in this
  // game a rival guessing does not cost you anything.
  rivalGuessed: {
    notes: [
      { frequency: 880, at: 0, duration: 0.07, gain: 0.6 },
      { frequency: 659.25, at: 0.07, duration: 0.12, gain: 0.6 },
    ],
    group: 'verdict',
  },
  // A near miss, heard only by the guesser: one soft blip, up.
  guessClose: {
    notes: [{ frequency: 587.33, to: 739.99, at: 0, duration: 0.1, gain: 0.5 }],
    group: 'verdict',
  },
  // Wrong. Not a buzzer: two low ticks, the quietest verdict of the three.
  guessWrong: {
    notes: [
      { frequency: 196, at: 0, duration: 0.06, type: 'triangle', gain: 0.45 },
      { frequency: 174.61, at: 0.08, duration: 0.07, type: 'triangle', gain: 0.45 },
    ],
    group: 'verdict',
  },
  // The turn closed: two notes, down, and then the table appears.
  turnEnded: {
    notes: [
      { frequency: 659.25, at: 0, duration: 0.12, type: 'triangle' },
      { frequency: 523.25, at: 0.12, duration: 0.24, type: 'triangle' },
    ],
  },
  // Somebody else wrote in an open-chat room: one soft ping. Never your own.
  chatMessage: { notes: [{ frequency: 1046.5, at: 0, duration: 0.09, gain: 0.45 }] },
} satisfies Record<GameCue, Cue>;

const CUES: Record<SoundCue, Cue> = { ...FAMILY_CUES, ...GAME_CUES };

/** Plays a cue unless the player muted the game. Safe to call from stores. */
export const playSound = createSoundPlayer<SoundCue>(CUES);

declare global {
  interface Window {
    /**
     * Dev only: every cue asked for, in order. The audio itself cannot be
     * checked from a verification run — a hidden tab has no audio context and
     * nobody is listening — so this list is what proves a cue fired.
     */
    __sketchrushSound?: string[];
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') window.__sketchrushSound = cueLog;
