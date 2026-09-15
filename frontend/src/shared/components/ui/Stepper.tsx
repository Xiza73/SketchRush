import { MinusIcon, PlusIcon } from '@/shared/components/icons/GameIcons';
import { cn } from '@/shared/lib/cn';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  decrementLabel: string;
  incrementLabel: string;
}

/** Players stepper from CreateRoom.dc.html. */
export const Stepper = ({
  value,
  min,
  max,
  onChange,
  label,
  decrementLabel,
  incrementLabel,
}: StepperProps) => {
  const canDecrement = value > min;
  const canIncrement = value < max;
  const buttonClass = (enabled: boolean) =>
    cn(
      'flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-surface transition-colors',
      enabled ? 'text-ink hover:bg-line' : 'cursor-not-allowed text-faint',
    );
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-11 items-center justify-between rounded-[10px] bg-surface-2 px-1.5"
    >
      <button
        type="button"
        aria-label={decrementLabel}
        disabled={!canDecrement}
        onClick={() => onChange(value - 1)}
        className={buttonClass(canDecrement)}
      >
        <MinusIcon size={18} />
      </button>
      <output aria-live="polite" className="font-mono text-base font-bold">
        {value}
      </output>
      <button
        type="button"
        aria-label={incrementLabel}
        disabled={!canIncrement}
        onClick={() => onChange(value + 1)}
        className={buttonClass(canIncrement)}
      >
        <PlusIcon size={18} />
      </button>
    </div>
  );
};
