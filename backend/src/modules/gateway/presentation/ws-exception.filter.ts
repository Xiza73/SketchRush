import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { ErrorPayload } from '@shared/contract';
import { DomainException } from '@shared/domain/domain.exception';
import type { GameSocket } from './socket.types';

type AckFn = (response: { ok: false } & ErrorPayload) => void;

/**
 * Turns any error thrown by a handler (validation, domain, unexpected) into
 * the contract's `{ ok: false, code, message }`. Delivered through the ack
 * when the client sent one, otherwise through the `error` event.
 */
@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Gateway');

  catch(exception: unknown, host: ArgumentsHost): void {
    const payload = this.toPayload(exception);
    const args: unknown[] = host.getArgs();
    const ack = args.find((a): a is AckFn => typeof a === 'function');
    if (ack) {
      ack({ ok: false, ...payload });
      return;
    }
    const client = host.switchToWs().getClient<GameSocket>();
    client.emit('error', payload);
  }

  private toPayload(exception: unknown): ErrorPayload {
    if (exception instanceof DomainException) return exception.toPayload();
    this.logger.error(
      'Unhandled gateway error',
      exception instanceof Error ? exception.stack : String(exception),
    );
    return new DomainException('internal').toPayload();
  }
}
