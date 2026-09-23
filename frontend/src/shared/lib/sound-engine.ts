import { useUiStore } from '@/shared/stores/useUiStore';

/**
 * The family's sound engine, synthesised with the Web Audio API: nothing to
 * download, nothing to license, no asset pipeline.
 *
 * **This file is family layer and must not diverge between games.** What the
 * game chooses is the *cue table* next door in `sound.ts`; what lives here is
 * the voice, the envelope, the mute/volume gate and the de-duplication. WordRush
 * keeps both in one file, which condemns that file to permanent drift — the
 * whole point of `docs/shared-layer-inventory.md` is that shared files stay
 * byte-identical, so the two halves are split here.
 *
 * One voice design for every cue: sine and triangle oscillators through a single
 * low-pass filter and a master gain, with a real attack/decay envelope on every
 * note so nothing clicks. The master peak sits at about -14 dBFS (0.2 linear)
 * before the player's own volume, and most cues last under 250 ms.
 *
 * Browsers only let audio start after a user gesture. The context is created
 * lazily on the first cue and, if the browser keeps it suspended, resumed on the
 * next pointer or key event — a cue that fires before that is simply lost, which
 * is the right failure for a notification sound.
 */

export interface Note {
  /** Hz at the start of the note. */
  frequency: number;
  /** Hz at its end, when the note glides. */
  to?: number;
  /** Seconds after the cue starts. */
  at: number;
  /** Seconds. */
  duration: number;
  type?: OscillatorType;
  /** Relative to the master peak (1 = -14 dBFS). */
  gain?: number;
}

export interface Cue {
  notes: Note[];
  /**
   * Cues of the same family never overlap: the second one inside
   * `GROUP_GAP_MS` is dropped, so two things that always arrive together
   * sound once, not twice.
   */
  group?: string;
}

/** Master peak before the player's volume: about -14 dBFS. */
const PEAK = 0.2;
const GROUP_GAP_MS = 320;
/** Everything above this is rolled off, which is what keeps the cues soft. */
const LOWPASS_HZ = 3_000;

/**
 * The cues every game in the family shares, because the events behind them are
 * family layer: a room, its roster, the clock running out, a sticker, typing,
 * and the two room-form cues. A game spreads these into its own table and adds
 * the sounds that are the reason it exists.
 *
 * `keyTap` is the one cue that is off unless the player asks for it. The two
 * room-form cues answer to mute and volume like everything else and **never**
 * to the keyboard toggle: choosing a rule is not typing.
 */
export const FAMILY_CUES = {
  // A room exists: a small rising chime.
  roomCreated: {
    notes: [
      { frequency: 523.25, at: 0, duration: 0.1, type: 'triangle' },
      { frequency: 659.25, at: 0.07, duration: 0.1, type: 'triangle' },
      { frequency: 880, at: 0.14, duration: 0.18, gain: 0.9 },
    ],
  },
  // Somebody arrived / left: the same two notes, one up, one down.
  playerJoined: {
    notes: [
      { frequency: 587.33, at: 0, duration: 0.07, gain: 0.8 },
      { frequency: 880, at: 0.06, duration: 0.11, gain: 0.8 },
    ],
    group: 'roster',
  },
  playerLeft: {
    notes: [
      { frequency: 698.46, at: 0, duration: 0.07, gain: 0.7 },
      { frequency: 493.88, at: 0.06, duration: 0.13, gain: 0.7 },
    ],
    group: 'roster',
  },
  // The last seconds of the clock.
  timeWarning: { notes: [{ frequency: 880, at: 0, duration: 0.05, gain: 0.5 }] },
  // A sticker landing: a little pop.
  sticker: { notes: [{ frequency: 880, to: 1396.91, at: 0, duration: 0.06, gain: 0.6 }] },
  // Typing: the quietest cue, and off unless the player asks for it.
  keyTap: { notes: [{ frequency: 659.25, at: 0, duration: 0.025, gain: 0.16 }] },
  // Picking an option in a room form: one short click. A host walking down the
  // settings hears a rhythm, not a fanfare.
  optionSelect: { notes: [{ frequency: 987.77, at: 0, duration: 0.04, gain: 0.2 }] },
  // The rules were saved: two quick soft notes, up.
  settingsSaved: {
    notes: [
      { frequency: 659.25, at: 0, duration: 0.07, gain: 0.5 },
      { frequency: 987.77, at: 0.07, duration: 0.12, gain: 0.5 },
    ],
    group: 'settings',
  },
  gameWon: {
    notes: [
      { frequency: 523.25, at: 0, duration: 0.11, type: 'triangle' },
      { frequency: 659.25, at: 0.09, duration: 0.11, type: 'triangle' },
      { frequency: 783.99, at: 0.18, duration: 0.11, type: 'triangle' },
      { frequency: 1046.5, at: 0.27, duration: 0.32 },
    ],
    group: 'final',
  },
  gameLost: {
    notes: [
      { frequency: 440, at: 0, duration: 0.13, type: 'triangle' },
      { frequency: 369.99, at: 0.13, duration: 0.13, type: 'triangle' },
      { frequency: 293.66, at: 0.26, duration: 0.3, type: 'triangle' },
    ],
    group: 'final',
  },
} satisfies Record<string, Cue>;

export type FamilyCue = keyof typeof FAMILY_CUES;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let unlockArmed = false;
const lastPlayed = new Map<string, number>();

const build = (): AudioContext | null => {
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = LOWPASS_HZ;
  filter.Q.value = 0.5;
  master = context.createGain();
  master.gain.value = 1;
  master.connect(filter);
  filter.connect(context.destination);
  return context;
};

/** Resumes a suspended context on the next gesture, once. */
const armUnlock = (ctx: AudioContext) => {
  if (unlockArmed) return;
  unlockArmed = true;
  const resume = () => {
    void ctx.resume();
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
  };
  window.addEventListener('pointerdown', resume);
  window.addEventListener('keydown', resume);
};

const playNote = (ctx: AudioContext, out: GainNode, note: Note, volume: number) => {
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  const start = ctx.currentTime + note.at;
  const peak = Math.max(0.0002, PEAK * (note.gain ?? 1) * volume);
  // A short attack and a decay over the rest of the note: an envelope, not a
  // gate, which is what keeps every cue free of clicks.
  const attack = Math.min(0.012, note.duration * 0.4);
  oscillator.type = note.type ?? 'sine';
  oscillator.frequency.setValueAtTime(note.frequency, start);
  if (note.to !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(note.to, start + note.duration);
  }
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
  oscillator.connect(envelope);
  envelope.connect(out);
  oscillator.start(start);
  oscillator.stop(start + note.duration + 0.03);
};

/** Every cue asked for, in order. Dev only, for the verification runs. */
export const cueLog: string[] = [];

/**
 * Builds the game's `playSound` from its own cue table. Safe to call from
 * stores: it never throws and never awaits.
 */
export const createSoundPlayer =
  <Name extends string>(cues: Record<Name, Cue>) =>
  (cue: Name): void => {
    if (import.meta.env.DEV) cueLog.push(cue);
    const { muted, volume, keyboardSounds } = useUiStore.getState();
    if (muted || volume <= 0) return;
    if (cue === 'keyTap' && !keyboardSounds) return;

    const spec = cues[cue];
    if (!spec) return;
    if (spec.group) {
      const now = Date.now();
      const last = lastPlayed.get(spec.group) ?? 0;
      if (now - last < GROUP_GAP_MS) return;
      lastPlayed.set(spec.group, now);
    }

    const ctx = build();
    if (!ctx || !master) return;
    if (ctx.state === 'suspended') {
      armUnlock(ctx);
      return;
    }
    for (const note of spec.notes) playNote(ctx, master, note, volume);
  };
