import { useCallback } from 'react';

import { socket } from '@/core/session/lib/socket';
import type { FillPayload, StrokePayload } from '@/shared/contract';

import { useTurnStore } from '../../stores/useTurnStore';

/**
 * The drawer's end of the canvas.
 *
 * Every operation is applied locally **before** it is sent, so the line follows
 * the hand instead of the network. The broadcast comes back to the drawer as
 * well, which is why the store drops draw events while it is my own turn.
 *
 * These are fire-and-forget: a dropped stroke is a lost pixel, and blocking the
 * next one on an ack would put the round trip inside the drawing. Anything that
 * actually went wrong (not the drawer, turn over) arrives on the `error` event.
 */
export const useDraw = () => {
  const sendStroke = useCallback((payload: StrokePayload) => {
    useTurnStore.getState().pushLocalOp({ kind: 'stroke', ...payload });
    socket.emit('draw:stroke', payload);
  }, []);

  const sendFill = useCallback((payload: FillPayload) => {
    const ops = useTurnStore.getState().ops;
    useTurnStore.getState().pushLocalOp({ kind: 'fill', id: ops.length, ...payload });
    socket.emit('draw:fill', payload);
  }, []);

  const sendUndo = useCallback(() => {
    useTurnStore.getState().undoLocal();
    socket.emit('draw:undo');
  }, []);

  const sendClear = useCallback(() => {
    useTurnStore.getState().clearLocal();
    socket.emit('draw:clear');
  }, []);

  return { sendStroke, sendFill, sendUndo, sendClear };
};
