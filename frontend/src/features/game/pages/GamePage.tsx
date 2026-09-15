import { useParams } from 'react-router-dom';

import { LeaveGameAction } from '@/core/session/components/LeaveGameAction';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { RoomContext } from '@/shared/components/layout/RoomContext';
import { TopBar } from '@/shared/components/layout/TopBar';

import { GameContainer } from '../containers/GameContainer';

export const GamePage = () => {
  const { code = '' } = useParams();
  const session = useSessionStore((state) => state.session);
  const roomCode = session?.roomCode ?? code;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        context={<RoomContext code={roomCode} />}
        playerName={session?.name}
        leaveAction={<LeaveGameAction />}
      />
      <GameContainer roomCode={roomCode} />
    </div>
  );
};
