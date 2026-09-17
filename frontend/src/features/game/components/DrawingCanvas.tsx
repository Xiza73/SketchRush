import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { ROOM_LIMITS, type DrawOp, type FillPayload, type Point, type StrokePayload } from '@/shared/contract';
import { cn } from '@/shared/lib/cn';

import { paint, paintPaper, START, type PaintCursor } from '../lib/painter';

export type CanvasTool = 'brush' | 'eraser' | 'fill';

interface DrawingCanvasProps {
  ops: DrawOp[];
  /** Bumped by the store whenever the drawing is no longer an extension of itself. */
  generation: number;
  /** True only for the drawer, and only while the turn is being drawn. */
  interactive: boolean;
  tool: CanvasTool;
  color: number;
  size: number;
  onStroke: (payload: StrokePayload) => void;
  onFill: (payload: FillPayload) => void;
  /** What the sheet is, for a reader that cannot see it. */
  label: string;
  className?: string;
}

/**
 * Twenty messages a second. Slower and the line lags the hand; faster and a
 * long turn is thousands of frames for a drawing nobody can see the difference
 * in. The server's rate limit is three times this, so a slow frame never trips it.
 */
const FLUSH_MS = 50;

/** Points closer than this (normalised) add nothing but bytes. */
const MIN_STEP = 0.002;

export const DrawingCanvas = ({
  ops,
  generation,
  interactive,
  tool,
  color,
  size,
  onStroke,
  onFill,
  label,
  className,
}: DrawingCanvasProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<PaintCursor>(START);
  const paintedGeneration = useRef(-1);
  const [pixels, setPixels] = useState({ width: 0, height: 0 });

  // --- sizing -------------------------------------------------------------
  // The backing store follows the element, not the other way round: a canvas
  // sized in CSS alone is drawn at 300x150 and scaled up into a blur.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry?.contentRect;
      if (!rect || rect.width === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setPixels({
        width: Math.round(rect.width * dpr),
        height: Math.round(rect.height * dpr),
      });
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // --- painting -----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    // No `willReadFrequently`: that hint moves the canvas off the GPU to make
    // `getImageData` cheap, and strokes outnumber fills by thousands to one.
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || pixels.width === 0) return;

    const resized = canvas.width !== pixels.width || canvas.height !== pixels.height;
    if (resized) {
      canvas.width = pixels.width;
      canvas.height = pixels.height;
    }
    // A resize wipes the backing store and an undo invalidates what is on it;
    // either way the only honest thing to do is paint the whole drawing again.
    if (resized || paintedGeneration.current !== generation) {
      paintPaper(ctx, canvas.width, canvas.height);
      cursorRef.current = START;
      paintedGeneration.current = generation;
    }
    cursorRef.current = paint(ctx, ops, cursorRef.current, canvas.width, canvas.height);
  }, [ops, generation, pixels]);

  // --- the hand -----------------------------------------------------------
  const strokeId = useRef(1);
  const pending = useRef<Point[]>([]);
  const last = useRef<Point | null>(null);
  const timer = useRef<number | null>(null);
  // Read inside the flush timer, which would otherwise keep the first values
  // it closed over for the whole stroke.
  const settings = useRef({ tool, color, size });
  useEffect(() => {
    settings.current = { tool, color, size };
  }, [tool, color, size]);

  const flush = useCallback(() => {
    const points = pending.current;
    if (points.length === 0) return;
    pending.current = [];
    const { tool: currentTool, color: currentColor, size: currentSize } = settings.current;
    onStroke({
      id: strokeId.current,
      tool: currentTool === 'eraser' ? 'eraser' : 'brush',
      color: currentColor,
      size: currentSize,
      points: points.slice(0, ROOM_LIMITS.strokeChunkPoints),
    });
  }, [onStroke]);

  const stopTimer = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const pointAt = (event: ReactPointerEvent<HTMLCanvasElement>): Point | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    // Clamped, not rejected: a finger that slips off the edge should finish the
    // line at the edge, and the server only accepts 0..1.
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive || event.button !== 0) return;
    const point = pointAt(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === 'fill') {
      onFill({ color, at: point });
      return;
    }

    strokeId.current += 1;
    pending.current = [point];
    last.current = point;
    stopTimer();
    timer.current = window.setInterval(flush, FLUSH_MS);
    flush();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive || last.current === null) return;
    const point = pointAt(event);
    if (!point) return;
    const dx = point.x - last.current.x;
    const dy = point.y - last.current.y;
    if (dx * dx + dy * dy < MIN_STEP * MIN_STEP) return;
    last.current = point;
    pending.current.push(point);
  };

  const endStroke = () => {
    if (last.current === null) return;
    last.current = null;
    stopTimer();
    flush();
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        // 4:3 is not negotiable — the coordinates are normalised, so a sheet
        // that is a different shape on my screen draws a different picture.
        // `.canvas-bound` caps the width at what 4:3 allows in the height
        // budget, and the height follows; the budget itself lives in CSS
        // variables the screen sets, because it changes when a keyboard opens.
        'canvas-bound relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-white shadow-card',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={cn(
          'absolute inset-0 h-full w-full',
          // Only the drawer's finger belongs to the canvas. `touch-none` on a
          // watcher's screen swallows the scroll gesture over the largest
          // element on the page, so on a phone they get stuck on a drawing they
          // cannot even draw on.
          interactive && 'touch-none',
          interactive && (tool === 'fill' ? 'cursor-pointer' : 'cursor-crosshair'),
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
      />
    </div>
  );
};
