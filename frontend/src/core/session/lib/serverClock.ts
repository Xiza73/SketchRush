import { socket } from './socket';

/**
 * How far this browser's clock is from the server's, in milliseconds.
 *
 * Every deadline in the game is an absolute server timestamp. That is the right
 * shape — two counters ticking separately drift apart — but it quietly assumes
 * both machines agree on what *now* is, and browsers routinely do not. A machine
 * measured here ran **4.5 seconds ahead** of the server: the turn clock reached
 * zero four and a half seconds early and sat there, dead, while the server was
 * still running the turn. A clock erring the other way is worse — the turn ends
 * mid-word while the screen still shows time on it.
 *
 * So: ask the server once per connection, correct for the round trip, and
 * derive every countdown from `serverNow()` instead of `Date.now()`.
 */
let offset = 0;

/**
 * Cristian's algorithm. The reply was written at some instant between sending
 * and receiving; the midpoint is the best guess available without a better
 * clock to appeal to, and the error is bounded by half the round trip.
 */
const measure = async (): Promise<number | null> =>
  new Promise((resolve) => {
    const sentAt = Date.now();
    let settled = false;
    // Bare rather than `window.`: this module is unit tested, and the test
    // environment has no DOM. Both realms have a global setTimeout.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 4000);

    socket.emit('time:sync', (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!response.ok) return resolve(null);
      const receivedAt = Date.now();
      resolve(response.now + (receivedAt - sentAt) / 2 - receivedAt);
    });
  });

/**
 * Measures a few times and keeps the sample from the fastest round trip.
 *
 * A single sample is at the mercy of one slow packet, and averaging drags the
 * good samples towards the bad ones. The quickest exchange is the one whose
 * midpoint assumption was least wrong, so that is the one worth keeping — the
 * same reason NTP prefers its lowest-delay sample.
 */
const SAMPLES = 3;

export const syncServerClock = async (): Promise<void> => {
  let best: number | null = null;
  let bestTrip = Infinity;

  for (let i = 0; i < SAMPLES; i++) {
    const sentAt = Date.now();
    const sample = await measure();
    const trip = Date.now() - sentAt;
    if (sample !== null && trip < bestTrip) {
      best = sample;
      bestTrip = trip;
    }
  }
  // A failed sync is not worth breaking the game over: the clock falls back to
  // this machine's own, which is what it used before any of this existed.
  if (best !== null) offset = best;
};

/** The server's `now`, as well as this connection can tell. */
export const serverNow = (): number => Date.now() + offset;

/** Exposed for the connection banner and for diagnosing a suspicious clock. */
export const clockOffset = (): number => offset;
