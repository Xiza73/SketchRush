import { cn } from '@/shared/lib/cn';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  /** Optional accessible label when the visible label is terse (e.g. "ES"). */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string | number> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  mono?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/** Segmented control from CreateRoom.dc.html (`.seg` / `.seg-on`). */
export const Segmented = <T extends string | number>({
  options,
  value,
  onChange,
  label,
  mono = false,
  size = 'md',
  className,
}: SegmentedProps<T>) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={cn('grid gap-2', className)}
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={active}
          aria-label={option.ariaLabel}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center justify-center rounded-[10px] px-2 font-semibold transition-colors',
            size === 'md' ? 'h-11 text-sm' : 'h-10 min-w-11 text-[13px]',
            mono && 'font-mono',
            active ? 'bg-ink text-on-ink' : 'bg-surface-2 text-ink-2 hover:text-ink',
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
