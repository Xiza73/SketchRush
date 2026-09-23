import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROOM_LIMITS } from '@/shared/contract';
import { useT } from '@/shared/i18n';
import { lobbyPath } from '@/shared/routes/paths';
import { kickCooldown, useKickCooldown } from '@/shared/stores/useKickCooldown';
import { toast } from '@/shared/stores/useToastStore';
import { useUiStore } from '@/shared/stores/useUiStore';
import { playSound } from '@/shared/lib/sound';

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
  hints: true,
});

/** Owns the create/join forms; the name is shared by both actions. */
export const HomeContainer = () => {
  const t = useT();
  const navigate = useNavigate();
  const rememberedName = useUiStore((state) => state.rememberedName);
  const rememberName = useUiStore((state) => state.rememberName);
  const uiLang = useUiStore((state) => state.lang);

  const [values, setValues] = useState<CreateRoomFormValues>(() =>
    defaultValues(rememberedName, uiLang),
  );
  // Typed by hand: an invitation link no longer lands here, it goes to
  // `/room/CODE` and the guard shows the join view there.
  const [code, setCode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const { createRoom, pending: creating } = useCreateRoom();
  const { joinRoom, pending: joining } = useJoinRoom();
  // The block follows the name typed in the create form, which the join
  // form shares: both actions send the same name.
  const kickedSeconds = useKickCooldown(code, values.name);

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
    if (result.ok) {
      playSound('roomCreated');
      navigate(lobbyPath(result.value.roomCode));
      return;
    }
    toast.error(result.error.message === 'timeout' ? 'timeout' : result.error.code);
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
    if (result.ok) {
      navigate(lobbyPath(result.value.roomCode));
      return;
    }
    // A kick is not a toast: the notice under the field counts the real
    // remaining time down and holds the button while it runs.
    if (result.error.code === 'kicked') {
      kickCooldown.start(
        code,
        name,
        result.error.retryAfterSeconds ?? ROOM_LIMITS.kickRejoinSeconds,
      );
      return;
    }
    toast.error(result.error.message === 'timeout' ? 'timeout' : result.error.code);
  };

  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <CreateRoomForm
        t={t}
        values={values}
        nameError={nameError}
        pending={creating}
        onChange={(patch) => {
          // Choosing a rule is room furniture: it answers to mute and volume
          // but never to the keyboard toggle. Typing the name goes through this
          // same handler and must stay silent, or every keystroke would click.
          if (!('name' in patch)) playSound('optionSelect');
          setValues((current) => ({ ...current, ...patch }));
        }}
        onSubmit={() => void handleCreate()}
      />
      <JoinRoomForm
        t={t}
        code={code}
        codeError={codeError}
        pending={joining}
        kickedSeconds={kickedSeconds}
        onCodeChange={(next) => {
          setCode(next);
          if (codeError) setCodeError(null);
        }}
        onSubmit={() => void handleJoin()}
      />
    </div>
  );
};
