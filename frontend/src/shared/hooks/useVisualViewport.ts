import { useEffect, useState } from 'react';

export interface ViewportState {
  /** Height actually visible right now, in CSS pixels. */
  height: number;
  /** True when something — in practice a keyboard — is covering the page. */
  keyboardOpen: boolean;
}

/**
 * Anything smaller than this is a URL bar collapsing, a toolbar, a rounding
 * error. A keyboard takes a third of a phone; nothing else comes close.
 */
const KEYBOARD_MIN = 150;

const read = (): ViewportState => {
  const visual = window.visualViewport;
  if (!visual) return { height: window.innerHeight, keyboardOpen: false };
  return {
    height: visual.height,
    keyboardOpen: window.innerHeight - visual.height > KEYBOARD_MIN,
  };
};

/**
 * What the page can actually see, as opposed to what the layout thinks it has.
 *
 * An on-screen keyboard does not resize the layout viewport: `100svh` keeps
 * reporting the full screen while a third of it sits under the keys, and the
 * browser's only response is to scroll the focused input into view — taking
 * everything else with it. On a phone that means the drawing, the letters and
 * the clock all leave the screen the moment a guesser starts typing, which is
 * exactly when they need them.
 *
 * `visualViewport` is the only API that reports the truth. Safari has had it
 * since 13 and Chrome since 61; the fallback for anything older is the layout
 * viewport, which is what the page used before this existed.
 */
export const useVisualViewport = (): ViewportState => {
  const [state, setState] = useState<ViewportState>(() =>
    typeof window === 'undefined' ? { height: 0, keyboardOpen: false } : read(),
  );

  useEffect(() => {
    const visual = window.visualViewport;
    const update = () => setState(read());
    update();

    // `scroll` matters as much as `resize`: iOS reports the keyboard by
    // shifting the visual viewport's offset before its height settles.
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => {
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return state;
};
