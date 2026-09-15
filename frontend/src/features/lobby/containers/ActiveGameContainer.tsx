import { useNavigate } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import type { FullState } from '@/shared/contract';
import { useT } from '@/shared/i18n';
import { pathForStatus } from '@/shared/routes/paths';

import { ActiveGameCard } from '../components/ActiveGameCard';

interface ActiveGameContainerProps {
  snapshot: FullState;
  /** Code from an invitation link the player arrived with, when it is another room. */
  invitedCode?: string | null;
}

export const ActiveGameContainer = ({ snapshot, invitedCode }: ActiveGameContainerProps) => {
  const t = useT();
  const navigate = useNavigate();
  const leaveRoom = useSessionStore((state) => state.leaveRoom);

  const { status, code } = snapshot.lobby;
  const turn = snapshot.turn;
  const stage =
    status === 'lobby'
      ? t.home.activeLobby
      : turn
        ? t.common.roundOf(turn.round, turn.totalRounds)
        : t.home.activeResults;

  return (
    <ActiveGameCard
      t={t}
      code={code}
      stage={status === 'between-turns' ? t.home.activeResults : stage}
      invitedCode={invitedCode}
      onResume={() => navigate(pathForStatus(status, code))}
      onLeave={() => void leaveRoom()}
    />
  );
};
