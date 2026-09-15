import type { ErrorPayload } from '@/shared/contract';

/** Outcome of a socket request with acknowledgement. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: ErrorPayload };
/** Value type of acks that carry no data (the contract's `EmptyAck`). */
export type EmptyOk = object;

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T>(error: ErrorPayload): Result<T> => ({ ok: false, error });
