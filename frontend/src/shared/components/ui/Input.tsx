import type { InputHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  invalid?: boolean;
}

export const Input = ({ mono, invalid, className, ...rest }: InputProps) => (
  <input
    aria-invalid={invalid || undefined}
    className={cn(
      'h-12 w-full rounded-[10px] border-[1.5px] bg-surface px-4 text-[15px] font-medium text-ink outline-none transition-colors placeholder:text-faint focus:border-ink',
      invalid ? 'border-red' : 'border-line',
      mono && 'font-mono tracking-[0.2em] uppercase',
      className,
    )}
    {...rest}
  />
);
