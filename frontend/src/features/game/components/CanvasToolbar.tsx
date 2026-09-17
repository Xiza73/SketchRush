import { BRUSH_SIZES, PALETTE } from '@/shared/contract';
import {
  BrushIcon,
  BucketIcon,
  EraserIcon,
  RedoIcon,
  TrashIcon,
  UndoIcon,
} from '@/shared/components/icons/GameIcons';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import type { CanvasTool } from './DrawingCanvas';

interface CanvasToolbarProps {
  tool: CanvasTool;
  color: number;
  size: number;
  disabled: boolean;
  onTool: (tool: CanvasTool) => void;
  onColor: (index: number) => void;
  onSize: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  /** Greys out the redo button when there is nothing to put back. */
  canRedo: boolean;
  onClear: () => void;
}

const toolButton =
  'flex h-10 w-10 items-center justify-center rounded-[10px] border transition-colors disabled:opacity-40';

/** The drawer's controls. Nobody else ever sees them. */
export const CanvasToolbar = ({
  tool,
  color,
  size,
  disabled,
  onTool,
  onColor,
  onSize,
  onUndo,
  onRedo,
  canRedo,
  onClear,
}: CanvasToolbarProps) => {
  const t = useT();

  const tools: { id: CanvasTool; label: string; Icon: typeof BrushIcon }[] = [
    { id: 'brush', label: t.game.toolBrush, Icon: BrushIcon },
    { id: 'eraser', label: t.game.toolEraser, Icon: EraserIcon },
    { id: 'fill', label: t.game.toolFill, Icon: BucketIcon },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2.5">
      <div className="flex gap-1.5" role="group" aria-label={t.game.tools}>
        {tools.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-label={label}
            aria-pressed={tool === id}
            onClick={() => onTool(id)}
            className={cn(
              toolButton,
              tool === id
                ? 'border-ink bg-ink text-on-ink'
                : 'border-line bg-surface-2 text-ink-2 hover:text-ink',
            )}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      <div className="h-8 w-px bg-line" aria-hidden="true" />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.game.colors}>
        {PALETTE.map((swatch, index) => (
          <button
            key={swatch}
            type="button"
            disabled={disabled}
            aria-label={t.game.colorNumber(index + 1)}
            aria-pressed={color === index}
            onClick={() => onColor(index)}
            style={{ background: swatch }}
            className={cn(
              'h-7 w-7 rounded-lg border-2 transition-transform disabled:opacity-40',
              // The ring, not the swatch, carries the selection: a chosen white
              // and an unchosen white have to be told apart on a white card.
              color === index ? 'scale-110 border-ink' : 'border-line hover:scale-105',
            )}
          />
        ))}
      </div>

      <div className="h-8 w-px bg-line" aria-hidden="true" />

      <div className="flex items-center gap-1.5" role="group" aria-label={t.game.brushSize}>
        {BRUSH_SIZES.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-label={t.game.brushSizeNumber(option)}
            aria-pressed={size === option}
            onClick={() => onSize(option)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-[10px] border transition-colors disabled:opacity-40',
              size === option ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2',
            )}
          >
            <span
              aria-hidden="true"
              className="rounded-full bg-ink"
              style={{ width: option / 2 + 4, height: option / 2 + 4 }}
            />
          </button>
        ))}
      </div>

      <div className="ml-auto flex gap-1.5">
        <button
          type="button"
          disabled={disabled}
          aria-label={t.game.undo}
          onClick={onUndo}
          className={cn(toolButton, 'border-line bg-surface-2 text-ink-2 hover:text-ink')}
        >
          <UndoIcon size={18} />
        </button>
        <button
          type="button"
          disabled={disabled || !canRedo}
          aria-label={t.game.redo}
          onClick={onRedo}
          className={cn(toolButton, 'border-line bg-surface-2 text-ink-2 hover:text-ink')}
        >
          <RedoIcon size={18} />
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label={t.game.clearCanvas}
          onClick={onClear}
          className={cn(toolButton, 'border-line bg-surface-2 text-ink-2 hover:text-red')}
        >
          <TrashIcon size={18} />
        </button>
      </div>
    </div>
  );
};
