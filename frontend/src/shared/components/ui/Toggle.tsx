import { cn } from '@/shared/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** Switch from CreateRoom.dc.html: 40×24 pill, ink when on. */
export const Toggle = ({ checked, onChange, label, disabled }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50',
      checked ? 'bg-ink' : 'bg-faint',
    )}
  >
    <span
      className={cn(
        'absolute top-0.75 h-4.5 w-4.5 rounded-full bg-surface transition-[left] duration-150',
        checked ? 'left-4.75' : 'left-0.75',
      )}
    />
  </button>
);
