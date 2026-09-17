import { useEffect } from 'react';

interface DrawShortcuts {
  /** False for everybody but the drawer, and while the turn is not being drawn. */
  enabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** Fields whose own keystrokes are never ours to take. */
const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return TYPING.has(target.tagName) || target.isContentEditable;
};

/**
 * Ctrl+Z and Ctrl+Y on the drawing, and nowhere else.
 *
 * A global key listener in a game is a trap — it steals keys from every control
 * on the page — so this one refuses in three ways before it acts: only for the
 * drawer while they are drawing, never while the focus is in a field somebody is
 * typing into, and never when a modifier it does not recognise is held. The
 * guess box lives one column over and its `Z` has to stay its own.
 *
 * Three bindings for two actions: Windows and Linux redo with Ctrl+Y, macOS with
 * Cmd+Shift+Z, and enough people carry the other habit across that supporting
 * both costs a line and saves an argument.
 */
export const useDrawShortcuts = ({ enabled, onUndo, onRedo }: DrawShortcuts): void => {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isTyping(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onUndo, onRedo]);
};
