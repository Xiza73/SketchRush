import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Ink-on-paper inversion used by the "Tu acumulado" stat in the results screen. */
  inverted?: boolean;
}

/** `.card` from the mockups: white surface, 1 px line border, 16 px radius. */
export const Card = ({ className, inverted = false, ...rest }: CardProps) => (
  <div
    className={cn(
      'rounded-2xl border',
      inverted ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface',
      className,
    )}
    {...rest}
  />
);
