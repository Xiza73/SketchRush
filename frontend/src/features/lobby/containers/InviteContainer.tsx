import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROOM_LIMITS } from '@/shared/contract';
import { useT } from '@/shared/i18n';
import { lobbyPath } from '@/shared/routes/paths';
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

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (trimmed.length < ROOM_LIMITS.nameMinLength) {
      setNameError(t.home.nameRequired);
      return;
    }
    setNameError(null);
    rememberName(trimmed);
    const result = await joinRoom(code, trimmed);
    if (result.ok) navigate(lobbyPath(result.value.roomCode));
    else toast.error(result.error.message === 'timeout' ? 'timeout' : result.error.code);
  };

  return (
    <InviteJoinCard
      t={t}
      code={code}
      name={name}
      nameError={nameError}
      pending={pending}
      onNameChange={(next) => {
        setName(next);
        if (nameError) setNameError(null);
      }}
      onSubmit={() => void handleJoin()}
      onCreateOwn={onCreateOwn}
    />
  );
};
