import { UserX } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

interface KickButtonProps {
  label: string;
  name: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/** Host only: the small "throw out" control on a slot, a team row or an observer chip. */
export const KickButton = ({ label, name, disabled, onClick, className }: KickButtonProps) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    title={label}
    aria-label={`${name}: ${label}`}
    className={cn(
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-3 transition-colors hover:border-red hover:text-red disabled:opacity-50',
      className,
    )}
  >
    <UserX size={14} aria-hidden="true" />
  </button>
);
