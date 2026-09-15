import { type ValidationError, ValidationPipe } from '@nestjs/common';
import { DomainException } from '@shared/domain/domain.exception';

function describe(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((e) => {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    const own = e.constraints ? Object.values(e.constraints) : [];
    const nested = e.children ? describe(e.children, path) : [];
    return [...own.map((m) => `${path}: ${m}`), ...nested];
  });
}

/** class-validator on every inbound payload; failures become `invalid_payload`. */
export function createWsValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors: ValidationError[]) =>
      new DomainException('invalid_payload', describe(errors).join('; ') || 'Invalid payload'),
  });
}
