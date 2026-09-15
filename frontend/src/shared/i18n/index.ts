import { useUiStore } from '@/shared/stores/useUiStore';

import { en } from './en';
import { es, type Dictionary } from './es';

export type { Dictionary };

const dictionaries: Record<'es' | 'en', Dictionary> = { es, en };

/** Current UI dictionary; re-renders when the language changes. */
export const useT = (): Dictionary => {
  const lang = useUiStore((state) => state.lang);
  return dictionaries[lang];
};

/** Non-React access (stores, event handlers). */
export const getT = (): Dictionary => dictionaries[useUiStore.getState().lang];
