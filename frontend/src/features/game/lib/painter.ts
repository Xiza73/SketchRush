import type { DrawOp, Point, ShapeKind } from '@/shared/contract';

/**
 * The sheet is paper white in both themes. The palette is twelve inks chosen to
 * read on white; theming the surface would make half of them invisible and turn
 * the eraser into a colour of its own.
 */
export const PAPER = '#ffffff';

/**
 * Brush sizes are pixels at this width, scaled to whatever the canvas actually
 * is. Coordinates are normalised for exactly this reason — a stroke has to land
 * in the same place *and* be the same weight on a phone and on a desktop.
 */
const REFERENCE_WIDTH = 800;

/**
 * How far the painted operations have got. `ops[0..op-1]` are fully painted and
 * the first `point` points of `ops[op]` are. `op === ops.length` means done.
 *
 * It exists so a stroke that grows by four points costs four points of work
 * rather than a repaint of the whole drawing, forty times a second.
 */
export interface PaintCursor {
  op: number;
  point: number;
}

export const START: PaintCursor = { op: 0, point: 0 };

const toRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];


export const paintPaper = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
};

const strokeSegment = (
  ctx: CanvasRenderingContext2D,
  op: Extract<DrawOp, { kind: 'stroke' }>,
  from: number,
  width: number,
  height: number,
): void => {
  const points = op.points;
  if (points.length === 0) return;
  const ink = op.tool === 'eraser' ? PAPER : op.color;
  const lineWidth = Math.max(1, op.size * (width / REFERENCE_WIDTH));
  const at = (p: Point): [number, number] => [p.x * width, p.y * height];

  // A stroke of one point is a dot, and a tap has to leave a mark.
  if (points.length === 1) {
    const [x, y] = at(points[0]!);
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.strokeStyle = ink;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const [sx, sy] = at(points[from]!);
  ctx.moveTo(sx, sy);
  for (let i = from + 1; i < points.length; i++) {
    const [x, y] = at(points[i]!);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
};

/**
 * A rectangle or an ellipse from the two corners of a drag.
 *
 * Exported because the drawer's live preview has to be drawn by this exact
 * function: a preview that is one line of code away from what finally lands is
 * a preview that lies, and the lie only shows up when you let go.
 *
 * The drag is taken as opposite corners in any direction, so dragging up and
 * left makes the same shape as dragging down and right.
 */
export const strokeShape = (
  ctx: CanvasRenderingContext2D,
  op: { shape: ShapeKind; color: string; size: number; from: Point; to: Point },
  width: number,
  height: number,
): void => {
  const x0 = Math.min(op.from.x, op.to.x) * width;
  const y0 = Math.min(op.from.y, op.to.y) * height;
  const w = Math.abs(op.to.x - op.from.x) * width;
  const h = Math.abs(op.to.y - op.from.y) * height;

  ctx.strokeStyle = op.color;
  ctx.lineWidth = Math.max(1, op.size * (width / REFERENCE_WIDTH));
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (op.shape === 'rect') ctx.rect(x0, y0, w, h);
  else ctx.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
};

/**
 * Scanline flood fill over the pixels already on the canvas.
 *
 * The tolerance is what lets it reach under an antialiased edge instead of
 * leaving a halo; keeping it low is what stops it leaking through one.
 */
export const floodFill = (
  ctx: CanvasRenderingContext2D,
  at: Point,
  hex: string,
  width: number,
  height: number,
): void => {
  const x0 = Math.floor(at.x * width);
  const y0 = Math.floor(at.y * height);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return;

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const [fr, fg, fb] = toRgb(hex);
  const start = (y0 * width + x0) * 4;
  const [tr, tg, tb] = [data[start]!, data[start + 1]!, data[start + 2]!];
  const tolerance = 32;

  // Filling a region with the colour it already has never terminates usefully.
  if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) <= tolerance) return;

  const matches = (index: number): boolean =>
    Math.abs(data[index]! - tr) + Math.abs(data[index + 1]! - tg) + Math.abs(data[index + 2]! - tb) <=
    tolerance;

  const paint = (index: number): void => {
    data[index] = fr;
    data[index + 1] = fg;
    data[index + 2] = fb;
    data[index + 3] = 255;
  };

  const stack: number[] = [x0, y0];
  while (stack.length > 0) {
    const y = stack.pop()!;
    const seedX = stack.pop()!;
    let left = seedX;
    let right = seedX;
    const row = y * width;
    while (left > 0 && matches((row + left - 1) * 4)) left--;
    while (right < width - 1 && matches((row + right + 1) * 4)) right++;

    let spanAbove = false;
    let spanBelow = false;
    for (let x = left; x <= right; x++) {
      paint((row + x) * 4);
      if (y > 0) {
        const above = matches(((y - 1) * width + x) * 4);
        if (above && !spanAbove) stack.push(x, y - 1);
        spanAbove = above;
      }
      if (y < height - 1) {
        const below = matches(((y + 1) * width + x) * 4);
        if (below && !spanBelow) stack.push(x, y + 1);
        spanBelow = below;
      }
    }
  }

  ctx.putImageData(image, 0, 0);
};

/**
 * Paints everything between `cursor` and the end of `ops`, and returns where it
 * got to. The last operation is deliberately left "open" while it is a stroke:
 * more chunks of the same line are still on their way.
 */
export const paint = (
  ctx: CanvasRenderingContext2D,
  ops: readonly DrawOp[],
  cursor: PaintCursor,
  width: number,
  height: number,
): PaintCursor => {
  let { op, point } = cursor;

  while (op < ops.length) {
    const current = ops[op]!;

    if (current.kind === 'stroke') {
      if (point < current.points.length) {
        // One point back, so the new segment joins the line already painted.
        strokeSegment(ctx, current, Math.max(0, point - 1), width, height);
        point = current.points.length;
      }
      if (op === ops.length - 1) break;
      op += 1;
      point = 0;
      continue;
    }

    if (current.kind === 'clear') paintPaper(ctx, width, height);
    else if (current.kind === 'fill') floodFill(ctx, current.at, current.color, width, height);
    else strokeShape(ctx, current, width, height);
    op += 1;
    point = 0;
  }

  return { op, point };
};
