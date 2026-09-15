import { create } from 'zustand';

import type { ErrorCode } from '@/shared/contract';

export type ToastTone = 'error' | 'info' | 'success';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  /** Translated at render time by the Toaster. */
  code?: ErrorCode | 'timeout' | 'disconnected';
  /** Already-translated text, when the caller has the dictionary at hand. */
  text?: string;
}

interface ToastState {
  items: ToastItem[];
}

interface ToastActions {
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
  reset: () => void;
}

const TOAST_MS = 3200;
const MAX_VISIBLE = 3;
let nextId = 1;

export const useToastStore = create<ToastState & ToastActions>((set) => ({
  items: [],
  push: (toast) => {
    const id = nextId++;
    set((state) => ({ items: [...state.items, { ...toast, id }].slice(-MAX_VISIBLE) }));
    window.setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, TOAST_MS);
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  reset: () => set({ items: [] }),
}));

export const toast = {
  error: (code: ToastItem['code']) => useToastStore.getState().push({ tone: 'error', code }),
  errorText: (text: string) => useToastStore.getState().push({ tone: 'error', text }),
  info: (text: string) => useToastStore.getState().push({ tone: 'info', text }),
  success: (text: string) => useToastStore.getState().push({ tone: 'success', text }),
};
