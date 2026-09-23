import { create } from 'zustand';

import type { Language } from '@/shared/contract';

export type Theme = 'light' | 'dark';
export type UiLanguage = Language;

const LANG_KEY = 'sketchrush.lang';
const THEME_KEY = 'dle.theme';
const NAME_KEY = 'sketchrush.name';
const MUTED_KEY = 'sketchrush.muted';
const VOLUME_KEY = 'sketchrush.volume';
const KEY_SOUNDS_KEY = 'sketchrush.keySounds';
const DEFAULT_VOLUME = 0.7;

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage may be unavailable (private mode); the in-memory value still applies
  }
};

const getInitialLang = (): UiLanguage => {
  const stored = readStorage(LANG_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')
    ? 'en'
    : 'es';
};

const getInitialTheme = (): Theme => {
  const stored = readStorage(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

interface UiState {
  lang: UiLanguage;
  theme: Theme;
  /** Last name typed on the home screen, for convenience across visits. */
  rememberedName: string;
  /** The game's sound cues off; persisted like the theme. */
  muted: boolean;
  /** Master volume for every cue, 0 to 1. */
  volume: number;
  /** The typing tick: the one cue that is off unless the player asks for it. */
  keyboardSounds: boolean;
}

interface UiActions {
  setLang: (lang: UiLanguage) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  rememberName: (name: string) => void;
  toggleMuted: () => void;
  setVolume: (volume: number) => void;
  setKeyboardSounds: (on: boolean) => void;
}

/** Nothing stored means the default level, not silence. */
const readVolume = (): number => {
  const raw = readStorage(VOLUME_KEY);
  if (raw === null) return DEFAULT_VOLUME;
  const stored = Number(raw);
  if (!Number.isFinite(stored) || stored < 0 || stored > 1) return DEFAULT_VOLUME;
  return stored;
};

const initialState: UiState = {
  lang: getInitialLang(),
  theme: getInitialTheme(),
  rememberedName: readStorage(NAME_KEY) ?? '',
  muted: readStorage(MUTED_KEY) === '1',
  volume: readVolume(),
  keyboardSounds: readStorage(KEY_SOUNDS_KEY) === '1',
};

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  ...initialState,
  setLang: (lang) => {
    writeStorage(LANG_KEY, lang);
    document.documentElement.lang = lang;
    set({ lang });
  },
  setTheme: (theme) => {
    writeStorage(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  toggleMuted: () => {
    const muted = !get().muted;
    writeStorage(MUTED_KEY, muted ? '1' : '0');
    set({ muted });
  },
  setVolume: (value) => {
    const volume = Math.min(1, Math.max(0, value));
    writeStorage(VOLUME_KEY, String(volume));
    // Dragging the slider up is also how a muted player turns the sound back on.
    if (volume > 0 && get().muted) {
      writeStorage(MUTED_KEY, '0');
      set({ muted: false });
    }
    set({ volume });
  },
  setKeyboardSounds: (on) => {
    writeStorage(KEY_SOUNDS_KEY, on ? '1' : '0');
    set({ keyboardSounds: on });
  },
  rememberName: (rememberedName) => {
    writeStorage(NAME_KEY, rememberedName);
    set({ rememberedName });
  },
}));

// Sync the DOM with the derived initial values once at module load.
applyTheme(initialState.theme);
document.documentElement.lang = initialState.lang;
