import { create } from 'zustand';

import type { Language } from '@/shared/contract';

export type Theme = 'light' | 'dark';
export type UiLanguage = Language;

const LANG_KEY = 'sketchrush.lang';
const THEME_KEY = 'dle.theme';
const NAME_KEY = 'sketchrush.name';

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
}

interface UiActions {
  setLang: (lang: UiLanguage) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  rememberName: (name: string) => void;
}

const initialState: UiState = {
  lang: getInitialLang(),
  theme: getInitialTheme(),
  rememberedName: readStorage(NAME_KEY) ?? '',
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
  rememberName: (rememberedName) => {
    writeStorage(NAME_KEY, rememberedName);
    set({ rememberedName });
  },
}));

// Sync the DOM with the derived initial values once at module load.
applyTheme(initialState.theme);
document.documentElement.lang = initialState.lang;
