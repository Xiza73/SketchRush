import { describe, expect, it } from 'vitest';

import type { DrawOp } from '@/shared/contract';

import { paint, START } from './painter';

/**
 * Enough of a 2D context to record what was asked of it. The painter is judged
 * by the cursor it returns and the calls it makes, not by pixels — and a real
 * canvas is not available in a node test anyway.
 */
const fakeContext = () => {
  const calls: string[] = [];
  const ctx = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    fillRect: () => calls.push('fillRect'),
    beginPath: () => calls.push('beginPath'),
    moveTo: (x: number, y: number) => calls.push(`moveTo ${Math.round(x)},${Math.round(y)}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo ${Math.round(x)},${Math.round(y)}`),
    stroke: () => calls.push('stroke'),
    arc: () => calls.push('arc'),
    rect: (x: number, y: number, w: number, h: number) =>
      calls.push(`rect ${Math.round(x)},${Math.round(y)} ${Math.round(w)}x${Math.round(h)}`),
    ellipse: (x: number, y: number, rx: number, ry: number) =>
      calls.push(`ellipse ${Math.round(x)},${Math.round(y)} ${Math.round(rx)}x${Math.round(ry)}`),
    fill: () => calls.push('fill'),
  };
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
};

const stroke = (id: number, ...points: [number, number][]): DrawOp => ({
  kind: 'stroke',
  id,
  tool: 'brush',
  color: '#1c1a17',
  size: 10,
  points: points.map(([x, y]) => ({ x, y })),
});

const W = 100;
const H = 100;

describe('paint', () => {
  /**
   * Why redo does not bump the repaint generation.
   *
   * Undo takes the last operation off and repaints from scratch, leaving the
   * cursor on the new last stroke with that stroke still open. Redo then puts
   * an operation back on the end — an extension of what is already painted —
   * and the cursor has to carry on into it without being reset. If it did not,
   * redo would have to repaint the whole canvas to show one line again.
   */
  it('carries on into an operation appended after a repaint', () => {
    const ctx = fakeContext();
    const afterUndo = [stroke(1, [0, 0], [0.5, 0.5])];
    const cursor = paint(ctx, afterUndo, START, W, H);
    expect(cursor).toEqual({ op: 0, point: 2 });

    // Redo puts stroke 2 back. The first stroke must not be drawn again.
    const afterRedo = [...afterUndo, stroke(2, [0.8, 0.8], [0.9, 0.9])];
    ctx.calls.length = 0;
    const next = paint(ctx, afterRedo, cursor, W, H);

    expect(ctx.calls).toContain('moveTo 80,80');
    expect(ctx.calls).toContain('lineTo 90,90');
    expect(ctx.calls.filter((call) => call.startsWith('moveTo'))).toHaveLength(1);
    expect(next).toEqual({ op: 1, point: 2 });
  });

  it('draws a whole stroke and stops on it, because more chunks may follow', () => {
    const ctx = fakeContext();
    const ops = [stroke(1, [0, 0], [0.5, 0.5])];

    const cursor = paint(ctx, ops, START, W, H);

    expect(ctx.calls).toContain('moveTo 0,0');
    expect(ctx.calls).toContain('lineTo 50,50');
    // Still "inside" op 0: the line is open until another op arrives.
    expect(cursor).toEqual({ op: 0, point: 2 });
  });

  /**
   * The point of the cursor. A stroke that grows by two points must cost two
   * points of work, not a repaint of everything painted so far.
   */
  it('paints only the new points when a stroke grows', () => {
    const ctx = fakeContext();
    const ops = [stroke(1, [0, 0], [0.5, 0.5])];
    const cursor = paint(ctx, ops, START, W, H);

    ctx.calls.length = 0;
    const grown = [stroke(1, [0, 0], [0.5, 0.5], [0.9, 0.9])];
    const next = paint(ctx, grown, cursor, W, H);

    // One point back, so the new segment joins the line already on the canvas.
    expect(ctx.calls).toEqual(['beginPath', 'moveTo 50,50', 'lineTo 90,90', 'stroke']);
    expect(next).toEqual({ op: 0, point: 3 });
  });

  it('moves past a finished stroke once another operation follows it', () => {
    const ctx = fakeContext();
    const ops = [stroke(1, [0, 0], [0.5, 0.5]), stroke(2, [0.1, 0.1], [0.2, 0.2])];

    const cursor = paint(ctx, ops, START, W, H);

    expect(cursor).toEqual({ op: 1, point: 2 });
  });

  it('repaints nothing when called again with no new points', () => {
    const ctx = fakeContext();
    const ops = [stroke(1, [0, 0], [0.5, 0.5])];
    const cursor = paint(ctx, ops, START, W, H);

    ctx.calls.length = 0;
    const next = paint(ctx, ops, cursor, W, H);

    expect(ctx.calls).toEqual([]);
    expect(next).toEqual(cursor);
  });

  it('draws a one-point stroke as a dot, so a tap leaves a mark', () => {
    const ctx = fakeContext();
    const cursor = paint(ctx, [stroke(1, [0.5, 0.5])], START, W, H);

    expect(ctx.calls).toContain('arc');
    expect(ctx.calls).toContain('fill');
    expect(cursor).toEqual({ op: 0, point: 1 });
  });

  /**
   * `clear` is a marker in the list rather than an emptying of it, so replaying
   * the buffer paints over whatever a late joiner already had.
   */
  it('paints the paper again for a clear marker and carries on', () => {
    const ctx = fakeContext();
    const ops: DrawOp[] = [
      stroke(1, [0, 0], [0.5, 0.5]),
      { kind: 'clear', id: 2 },
      stroke(3, [0.9, 0.9], [1, 1]),
    ];

    const cursor = paint(ctx, ops, START, W, H);

    expect(ctx.calls).toContain('fillRect');
    expect(ctx.calls).toContain('lineTo 100,100');
    expect(cursor).toEqual({ op: 2, point: 2 });
  });

  it('draws a rectangle from the two corners of the drag', () => {
    const ctx = fakeContext();
    const ops: DrawOp[] = [
      { kind: 'shape', id: 1, shape: 'rect', color: '#1c1a17', size: 10,
        from: { x: 0.1, y: 0.2 }, to: { x: 0.6, y: 0.7 } },
    ];

    paint(ctx, ops, START, W, H);

    expect(ctx.calls).toContain('rect 10,20 50x50');
  });

  /**
   * The drag is two opposite corners, in whichever order the hand made them.
   * Dragging up and left has to give the same shape as dragging down and right.
   */
  it('does not care which way the drag went', () => {
    const forwards = fakeContext();
    const backwards = fakeContext();
    const box = { kind: 'shape', id: 1, shape: 'ellipse', color: '#1c1a17', size: 10 } as const;

    paint(forwards, [{ ...box, from: { x: 0.2, y: 0.2 }, to: { x: 0.8, y: 0.6 } }], START, W, H);
    paint(backwards, [{ ...box, from: { x: 0.8, y: 0.6 }, to: { x: 0.2, y: 0.2 } }], START, W, H);

    expect(forwards.calls).toEqual(backwards.calls);
    expect(forwards.calls).toContain('ellipse 50,40 30x20');
  });

  it('does nothing at all on an empty drawing', () => {
    const ctx = fakeContext();
    expect(paint(ctx, [], START, W, H)).toEqual(START);
    expect(ctx.calls).toEqual([]);
  });
});
