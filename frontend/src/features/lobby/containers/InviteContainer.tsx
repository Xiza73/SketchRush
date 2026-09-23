import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROOM_LIMITS } from '@/shared/contract';
import { useT } from '@/shared/i18n';
import { lobbyPath } from '@/shared/routes/paths';
import { kickCooldown, useKickCooldown } from '@/shared/stores/useKickCooldown';
import { toast } from '@/shared/stores/useToastStore';
import { useUiStore } from '@/shared/stores/useUiStore';

import { useJoinRoom } from '../api/join-room/useJoinRoom';
import { InviteJoinCard } from '../components/InviteJoinCard';

interface InviteContainerProps {
  code: string;
  onCreateOwn: () => void;
}

/** The `/?code=XXXX` flow: one name, one button. */
export const InviteContainer = ({ code, onCreateOwn }: InviteContainerProps) => {
  const t = useT();
  const navigate = useNavigate();
  const rememberedName = useUiStore((state) => state.rememberedName);
  const rememberName = useUiStore((state) => state.rememberName);

  const [name, setName] = useState(rememberedName);
  const [nameError, setNameError] = useState<string | null>(null);
  const { joinRoom, pending } = useJoinRoom();
  // The host threw this name out a moment ago: one notice, counting down.
  const kickedSeconds = useKickCooldown(code, name);

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (trimmed.length < ROOM_LIMITS.nameMinLength) {
      setNameError(t.home.nameRequired);
      return;
    }
    setNameError(null);
    rememberName(trimmed);
    const result = await joinRoom(code, trimmed);
    if (result.ok) {
      navigate(lobbyPath(result.value.roomCode));
      return;
    }
    // A kick is not a toast: the notice below the field holds the real
    // remaining time the server just sent and counts it down.
    if (result.error.code === 'kicked') {
      kickCooldown.start(
        code,
        trimmed,
        result.error.retryAfterSeconds ?? ROOM_LIMITS.kickRejoinSeconds,
      );
      return;
    }
    toast.error(result.error.message === 'timeout' ? 'timeout' : result.error.code);
  };

  return (
    <InviteJoinCard
      t={t}
      code={code}
      name={name}
      nameError={nameError}
      pending={pending}
      kickedSeconds={kickedSeconds}
      onNameChange={(next) => {
        setName(next);
        if (nameError) setNameError(null);
      }}
      onSubmit={() => void handleJoin()}
      onCreateOwn={onCreateOwn}
    />
  );
};
