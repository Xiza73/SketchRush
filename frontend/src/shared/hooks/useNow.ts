import { useEffect, useState } from 'react';

/**
 * Current time driven by requestAnimationFrame, re-rendering at most every
 * `resolutionMs`. Consumers derive countdowns from server snapshots with it.
 */
export const useNow = (resolutionMs = 100, enabled = true): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let lastBucket = Math.floor(Date.now() / resolutionMs);
    const tick = () => {
      const current = Date.now();
      const bucket = Math.floor(current / resolutionMs);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        setNow(current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [resolutionMs, enabled]);

  return now;
};
