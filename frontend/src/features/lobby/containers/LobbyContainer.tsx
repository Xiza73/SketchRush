import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { PageLoading } from '@/shared/components/ui/PageState';
import { ROOM_LIMITS, type RoomSettings } from '@/shared/contract';
import { useT } from '@/shared/i18n';
import { homeWithCode, PATHS, pathForStatus } from '@/shared/routes/paths';
import { toast } from '@/shared/stores/useToastStore';

import { useLeaveRoom } from '../api/leave-room/useLeaveRoom';
import { useSetReady } from '../api/set-ready/useSetReady';
import { useStartGame } from '../api/start-game/useStartGame';
import { useUpdateSettings } from '../api/update-settings/useUpdateSettings';
import { LobbyActions } from '../components/LobbyActions';
import { PlayerSlots } from '../components/PlayerSlots';
import { RoomCodeHeader } from '../components/RoomCodeHeader';
import { RoomSettingsDialog } from '../components/RoomSettingsDialog';
import { ScoringCard } from '../components/ScoringCard';
import { useLobbyStore } from '../stores/useLobbyStore';

export const LobbyContainer = () => {
  const t = useT();
  const navigate = useNavigate();
  const lobby = useLobbyStore((state) => state.lobby);
  const session = useSessionStore((state) => state.session);
  const { setReady } = useSetReady();
  const { startGame, pending: starting } = useStartGame();
  const { leaveRoom } = useLeaveRoom();
  const { updateSettings, pending: saving } = useUpdateSettings();
  const [rulesOpen, setRulesOpen] = useState(false);

  // Pushed transitions (round:start, or a lobby:update with a new status) move everyone along.
  useEffect(() => {
    if (lobby && lobby.status !== 'lobby') {
      navigate(pathForStatus(lobby.status, lobby.code), { replace: true });
    }
  }, [lobby, navigate]);

  if (!lobby || !session) return <PageLoading title={t.common.loading} />;

  const copyLink = async () => {
    const link = `${window.location.origin}${homeWithCode(lobby.code)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t.common.copied);
    } catch {
      toast.errorText(t.common.copyFailed);
    }
  };

  const toggleReady = async () => {
    const result = await setReady(!(lobby.me?.ready ?? false));
    if (!result.ok) toast.error(result.error.code);
  };

  const start = async () => {
    const result = await startGame();
    if (!result.ok) toast.error(result.error.code);
  };

  const saveRules = async (settings: RoomSettings) => {
    const result = await updateSettings(settings);
    if (!result.ok) {
      toast.error(result.error.code);
      return;
    }
    // The chips redraw from the server's `lobby:update`, never from these values.
    setRulesOpen(false);
    toast.success(t.lobby.rulesSaved);
  };

  const leave = () => {
    navigate(PATHS.home, { replace: true });
    void leaveRoom();
  };

  return (
    <div className="grid flex-1 grid-cols-1 gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-16 lg:py-9">
      <div className="flex flex-col gap-7">
        <RoomCodeHeader
          t={t}
          code={lobby.code}
          settings={lobby.settings}
          playerCount={lobby.playerCount}
          isHost={lobby.isHost}
          onCopyLink={() => void copyLink()}
          onChangeRules={() => setRulesOpen(true)}
        />
        <PlayerSlots t={t} players={lobby.players} capacity={lobby.settings.capacity} />
        <LobbyActions
          t={t}
          isHost={lobby.isHost}
          hostName={lobby.hostName}
          isReady={lobby.me?.ready ?? false}
          readyCount={lobby.readyCount}
          playerCount={lobby.playerCount}
          minPlayers={ROOM_LIMITS.minPlayers}
          starting={starting}
          onToggleReady={() => void toggleReady()}
          onStart={() => void start()}
          onLeave={leave}
        />
      </div>
      <ScoringCard t={t} />
      {lobby.isHost ? (
        <RoomSettingsDialog
          t={t}
          open={rulesOpen}
          settings={lobby.settings}
          playerCount={lobby.playerCount}
          pending={saving}
          onCancel={() => setRulesOpen(false)}
          onSave={(settings) => void saveRules(settings)}
        />
      ) : null}
    </div>
  );
};
