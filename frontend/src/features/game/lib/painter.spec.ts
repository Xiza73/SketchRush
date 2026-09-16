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
    fill: () => calls.push('fill'),
  };
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
};

const stroke = (id: number, ...points: [number, number][]): DrawOp => ({
  kind: 'stroke',
  id,
  tool: 'brush',
  color: 0,
  size: 10,
  points: points.map(([x, y]) => ({ x, y })),
});

const W = 100;
const H = 100;

describe('paint', () => {
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

  it('does nothing at all on an empty drawing', () => {
    const ctx = fakeContext();
    expect(paint(ctx, [], START, W, H)).toEqual(START);
    expect(ctx.calls).toEqual([]);
  });
});
