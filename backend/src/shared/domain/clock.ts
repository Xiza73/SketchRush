export const CLOCK = Symbol('CLOCK');

/** Source of "now" in epoch milliseconds; injected so tests can control time. */
export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
