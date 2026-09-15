import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'outline' | 'accent-outline' | 'ghost' | 'ink';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover disabled:hover:bg-accent',
  outline: 'border-[1.5px] border-ink text-ink bg-transparent hover:bg-surface-2',
  'accent-outline': 'border-[1.5px] border-accent text-accent bg-transparent hover:bg-accent-soft',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  ink: 'bg-ink text-on-ink hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm rounded-[10px] gap-2',
  md: 'h-12 px-5 text-[15px] rounded-[10px] gap-2',
  lg: 'h-13 px-7 text-base rounded-xl gap-2.5',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leading,
  trailing,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(
      'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none transition-[background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
      variants[variant],
      sizes[size],
      className,
    )}
    {...rest}
  >
    {leading}
    {children}
    {trailing}
  </button>
);
