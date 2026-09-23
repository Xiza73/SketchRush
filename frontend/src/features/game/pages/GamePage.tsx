import { useParams } from 'react-router-dom';

import { LeaveGameAction } from '@/core/session/components/LeaveGameAction';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { RoomContext } from '@/shared/components/layout/RoomContext';
import { TopBar } from '@/shared/components/layout/TopBar';
import { useT } from '@/shared/i18n';

import { GameContainer } from '../containers/GameContainer';

export const GamePage = () => {
  const { code = '' } = useParams();
  const t = useT();
  const session = useSessionStore((state) => state.session);
  const connection = useSessionStore((state) => state.connection);
  const roomCode = session?.roomCode ?? code;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        context={<RoomContext code={roomCode} />}
        playerName={session?.name}
        // While the socket is away the canvas, the clock and the scores stay
        // where they are: the pill is the only thing that says so.
        connectionLabel={connection === 'disconnected' ? t.common.reconnecting : undefined}
        leaveAction={<LeaveGameAction />}
      />
      <GameContainer roomCode={roomCode} />
    </div>
  );
};
