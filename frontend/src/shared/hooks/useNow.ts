import { useEffect, useState } from 'react';

import { serverNow } from '@/core/session/lib/serverClock';

/**
 * Current time driven by requestAnimationFrame, re-rendering at most every
 * `resolutionMs`. Consumers derive countdowns from server snapshots with it.
 *
 * It reads the **server's** clock, not this machine's. Every deadline arrives
 * as an absolute server timestamp, so subtracting a local `Date.now()` that is
 * seconds out makes the turn end early or late on that player's screen alone.
 * See `serverClock.ts` for how the offset is measured.
 */
export const useNow = (resolutionMs = 100, enabled = true): number => {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let lastBucket = Math.floor(serverNow() / resolutionMs);
    const tick = () => {
      const current = serverNow();
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
