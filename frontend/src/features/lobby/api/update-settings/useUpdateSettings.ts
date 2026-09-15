import { useCallback, useState } from 'react';

import { request, socket } from '@/core/session/lib/socket';
import type { EmptyOk, Result } from '@/shared/lib/result';

import { toUpdateSettingsRequest, type RoomSettingsForm } from './update-settings.dto';

/** Host-only edit of the room settings; the server answers with `lobby:update`. */
export const useUpdateSettings = () => {
  const [pending, setPending] = useState(false);

  const updateSettings = useCallback(async (form: RoomSettingsForm): Promise<Result<EmptyOk>> => {
    setPending(true);
    try {
      return await request<EmptyOk>((ack) =>
        socket.emit('room:update-settings', toUpdateSettingsRequest(form), ack),
      );
    } finally {
      setPending(false);
    }
  }, []);

  return { updateSettings, pending };
};
