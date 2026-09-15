import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROOM_LIMITS } from '@/shared/contract';
import { useT } from '@/shared/i18n';
import { lobbyPath } from '@/shared/routes/paths';
import { toast } from '@/shared/stores/useToastStore';
import { useUiStore } from '@/shared/stores/useUiStore';

import type { CreateRoomForm as CreateRoomFormValues } from '../api/create-room/create-room.dto';
import { useCreateRoom } from '../api/create-room/useCreateRoom';
import { useJoinRoom } from '../api/join-room/useJoinRoom';
import { CreateRoomForm } from '../components/CreateRoomForm';
import { JoinRoomForm } from '../components/JoinRoomForm';

const defaultValues = (name: string, uiLang: 'es' | 'en'): CreateRoomFormValues => ({
  name,
  language: uiLang,
  drawSeconds: 60,
  rounds: 3,
  capacity: ROOM_LIMITS.maxPlayers,
  guessMode: 'box',
  hintLetters: 1,
});

/** Owns the create/join forms; the name is shared by both actions. */
export const HomeContainer = () => {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rememberedName = useUiStore((state) => state.rememberedName);
  const rememberName = useUiStore((state) => state.rememberName);
  const uiLang = useUiStore((state) => state.lang);

  const [values, setValues] = useState<CreateRoomFormValues>(() =>
    defaultValues(rememberedName, uiLang),
  );
  const [code, setCode] = useState(() => (searchParams.get('code') ?? '').toUpperCase());
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const { createRoom, pending: creating } = useCreateRoom();
  const { joinRoom, pending: joining } = useJoinRoom();

  useEffect(() => {
    const fromUrl = searchParams.get('code');
    if (fromUrl) setCode(fromUrl.toUpperCase());
  }, [searchParams]);

  const validName = () => {
    const name = values.name.trim();
    if (name.length < ROOM_LIMITS.nameMinLength) {
      setNameError(t.home.nameRequired);
      return null;
    }
    setNameError(null);
    rememberName(name);
    return name;
  };

  const handleCreate = async () => {
    if (!validName()) return;
    const result = await createRoom(values);
    if (result.ok) navigate(lobbyPath(result.value.roomCode));
    else toast.error(result.error.message === 'timeout' ? 'timeout' : result.error.code);
  };

  const handleJoin = async () => {
    const name = validName();
    if (!name) return;
    if (!code.trim()) {
      setCodeError(t.home.codeRequired);
      return;
    }
    setCodeError(null);
    const result = await joinRoom(code, name);
    if (result.ok) navigate(lobbyPath(result.value.roomCode));
    else toast.error(result.error.message === 'timeout' ? 'timeout' : result.error.code);
  };

  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <CreateRoomForm
        t={t}
        values={values}
        nameError={nameError}
        pending={creating}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        onSubmit={() => void handleCreate()}
      />
      <JoinRoomForm
        t={t}
        code={code}
        codeError={codeError}
        pending={joining}
        onCodeChange={(next) => {
          setCode(next);
          if (codeError) setCodeError(null);
        }}
        onSubmit={() => void handleJoin()}
      />
    </div>
  );
};
