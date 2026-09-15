import type { ErrorCode, ErrorPayload } from '@shared/contract';
import { ERROR_MESSAGES } from './error-messages';

/**
 * The single exception type the domain and application layers throw. The
 * gateway maps it to the `{ code, message }` shape of the socket contract.
 */
export class DomainException extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'DomainException';
  }

  toPayload(): ErrorPayload {
    return { code: this.code, message: this.message };
  }
}
