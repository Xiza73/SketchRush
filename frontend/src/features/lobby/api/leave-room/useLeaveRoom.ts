import { useCallback } from 'react';

import { useSessionStore } from '@/core/session/stores/useSessionStore';

/** Leaves the room and forgets the session regardless of the server's answer. */
export const useLeaveRoom = () => {
  const leaveRoom = useCallback(() => useSessionStore.getState().leaveRoom(), []);
  return { leaveRoom };
};
