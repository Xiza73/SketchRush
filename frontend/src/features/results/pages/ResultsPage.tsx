import { useParams } from 'react-router-dom';

import { LeaveGameAction } from '@/core/session/components/LeaveGameAction';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { RoomContext } from '@/shared/components/layout/RoomContext';
import { TopBar } from '@/shared/components/layout/TopBar';
import { useNow } from '@/shared/hooks/useNow';
import { useT } from '@/shared/i18n';

import { ResultsContainer } from '../containers/ResultsContainer';
import { useResultsStore } from '../stores/useResultsStore';

const NextRoundCountdown = () => {
  const t = useT();
  const nextRoundAt = useResultsStore((state) => state.nextRoundAt);
  const gameEnd = useResultsStore((state) => state.gameEnd);
  const now = useNow(250, nextRoundAt !== null);
  if (gameEnd || nextRoundAt === null) return null;
  const seconds = Math.max(0, Math.ceil((nextRoundAt - now) / 1000));
  return (
    <span className="text-sm text-ink-2" role="timer">
      {t.results.nextRoundIn}{' '}
      <span className="font-mono font-bold text-ink tabular-nums">{t.common.seconds(seconds)}</span>
    </span>
  );
};

export const ResultsPage = () => {
  const t = useT();
  const { code = '' } = useParams<{ code: string }>();
  const session = useSessionStore((state) => state.session);
  const connection = useSessionStore((state) => state.connection);
  const roundEnd = useResultsStore((state) => state.roundEnd);
  const gameEnd = useResultsStore((state) => state.gameEnd);

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        context={
          session ? (
            <RoomContext
              code={session.roomCode}
              parts={[
                gameEnd
                  ? t.results.gameOver
                  : roundEnd
                    ? t.results.roundEnd(roundEnd.turn, roundEnd.totalTurns)
                    : null,
              ]}
            />
          ) : null
        }
        actions={<NextRoundCountdown />}
        leaveAction={<LeaveGameAction />}
        playerName={session?.name}
        connectionLabel={connection === 'disconnected' ? t.common.reconnecting : undefined}
      />
      <ResultsContainer roomCode={session?.roomCode ?? code} />
    </div>
  );
};
