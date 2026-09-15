import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { RoomContext } from '@/shared/components/layout/RoomContext';
import { TopBar } from '@/shared/components/layout/TopBar';
import { useT } from '@/shared/i18n';

import { LobbyContainer } from '../containers/LobbyContainer';
import { useLobbyStore } from '../stores/useLobbyStore';

export const LobbyPage = () => {
  const t = useT();
  const session = useSessionStore((state) => state.session);
  const connection = useSessionStore((state) => state.connection);
  const lobby = useLobbyStore((state) => state.lobby);

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        context={
          session ? (
            <RoomContext
              code={session.roomCode}
              parts={[t.lobby.title, lobby ? t.common.language[lobby.settings.language] : null]}
            />
          ) : null
        }
        playerName={session?.name}
        playerBadge={lobby?.isHost ? t.common.host : undefined}
        connectionLabel={connection === 'disconnected' ? t.common.reconnecting : undefined}
      />
      <LobbyContainer />
    </div>
  );
};
