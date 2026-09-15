import { useEffect } from 'react';

/**
 * Lifts the phone toast stack above a screen's bottom furniture (on the game
 * screen: the keyboard rows and the emote row). The `Toaster` lives in the app
 * shell, outside the page tree, so the offset travels as a custom property on
 * the document root. Pass null to leave the default 1rem in place.
 */
export const useToastSafeBottom = (offset: string | null): void => {
  useEffect(() => {
    if (!offset) return;
    const root = document.documentElement;
    root.style.setProperty('--toast-bottom', offset);
    return () => {
      root.style.removeProperty('--toast-bottom');
    };
  }, [offset]);
};
