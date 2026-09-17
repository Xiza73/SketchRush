import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import {
  ROOM_LIMITS,
  type DrawOp,
  type FillPayload,
  type Point,
  type ShapeKind,
  type ShapePayload,
  type StrokePayload,
} from '@/shared/contract';
import { cn } from '@/shared/lib/cn';

import { paint, paintPaper, START, strokeShape, type PaintCursor } from '../lib/painter';

export type CanvasTool = 'brush' | 'eraser' | 'fill' | ShapeKind;

/** The two that are dragged into existence rather than traced. */
const isShape = (tool: CanvasTool): tool is ShapeKind => tool === 'rect' || tool === 'ellipse';

interface DrawingCanvasProps {
  ops: DrawOp[];
  /** Bumped by the store whenever the drawing is no longer an extension of itself. */
  generation: number;
  /** True only for the drawer, and only while the turn is being drawn. */
  interactive: boolean;
  tool: CanvasTool;
  /** . Any colour the drawer picked, not an index into a palette. */
  color: string;
  size: number;
  onStroke: (payload: StrokePayload) => void;
  onShape: (payload: ShapePayload) => void;
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
  onShape,
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

  // --- the shape being dragged ---------------------------------------------
  /**
   * The preview lives on its own canvas, stacked over the drawing.
   *
   * Drawing it onto the main one would mean erasing it again on every pointer
   * move, and the only way to erase from that canvas is to repaint the whole
   * turn — forty times a second, against the incremental cursor that exists
   * precisely so that never happens. A second canvas is cleared in one call.
   */
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const anchor = useRef<Point | null>(null);

  const clearPreview = useCallback(() => {
    const overlay = overlayRef.current;
    overlay?.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  const drawPreview = useCallback(
    (to: Point) => {
      const overlay = overlayRef.current;
      const ctx = overlay?.getContext('2d');
      const from = anchor.current;
      if (!overlay || !ctx || !from) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      // The same function that will paint it for real, so what the drawer is
      // looking at is what the room gets.
      strokeShape(
        ctx,
        { shape: tool as ShapeKind, color, size, from, to },
        overlay.width,
        overlay.height,
      );
    },
    [tool, color, size],
  );

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

    if (isShape(tool)) {
      anchor.current = point;
      drawPreview(point);
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
    if (!interactive) return;
    const point = pointAt(event);
    if (!point) return;

    // A shape sends nothing while it is being dragged: it is one message on
    // pointer-up, not one per frame, so the preview is the drawer's alone until
    // they let go of it.
    if (anchor.current) {
      drawPreview(point);
      return;
    }

    if (last.current === null) return;
    const dx = point.x - last.current.x;
    const dy = point.y - last.current.y;
    if (dx * dx + dy * dy < MIN_STEP * MIN_STEP) return;
    last.current = point;
    pending.current.push(point);
  };

  const endStroke = (event?: ReactPointerEvent<HTMLCanvasElement>) => {
    const from = anchor.current;
    if (from) {
      anchor.current = null;
      clearPreview();
      const to = (event && pointAt(event)) ?? from;
      // A tap with no drag is not a shape. Letting it through would leave an
      // invisible zero-sized operation on the canvas for undo to trip over.
      if (Math.abs(to.x - from.x) > MIN_STEP || Math.abs(to.y - from.y) > MIN_STEP) {
        strokeId.current += 1;
        onShape({ id: strokeId.current, shape: tool as ShapeKind, color, size, from, to });
      }
      return;
    }

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
      {/*
        The shape being dragged, and nothing else. `pointer-events-none` is
        load-bearing: it sits over the canvas the hand is drawing on, and
        without it this element would swallow every move after the first.
      */}
      <canvas
        ref={overlayRef}
        aria-hidden="true"
        width={pixels.width}
        height={pixels.height}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
};
