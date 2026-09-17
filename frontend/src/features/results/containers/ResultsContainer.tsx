import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { ReactionOverlay } from '@/features/reactions/components/ReactionOverlay';
import { ReactionPicker } from '@/features/reactions/components/ReactionPicker';
import { PageLoading } from '@/shared/components/ui/PageState';
import { useT } from '@/shared/i18n';
import { gamePath, lobbyPath, PATHS } from '@/shared/routes/paths';
import { toast } from '@/shared/stores/useToastStore';

import { useLeaveRoom } from '../api/leave-room/useLeaveRoom';
import { useRestartRoom } from '../api/restart-room/useRestartRoom';
import { BreakdownTable } from '../components/BreakdownTable';
import { FinalBanner } from '../components/FinalBanner';
import { RoundHeader } from '../components/RoundHeader';
import { StandingsList } from '../components/StandingsList';
import { toTurnResultsViewModel } from '../models/results.model';
import { useResultsStore } from '../stores/useResultsStore';

interface ResultsContainerProps {
  roomCode: string;
}

export const ResultsContainer = ({ roomCode }: ResultsContainerProps) => {
  const t = useT();
  const navigate = useNavigate();
  const roundEnd = useResultsStore((state) => state.roundEnd);
  const gameEnd = useResultsStore((state) => state.gameEnd);
  const latestRoundStarted = useResultsStore((state) => state.latestRoundStarted);
  const roomStatus = useResultsStore((state) => state.roomStatus);
  const hostId = useResultsStore((state) => state.hostId);
  const myId = useSessionStore((state) => state.session?.playerId ?? null);
  const drawSeconds = useSessionStore(
    (state) => state.snapshot?.lobby.settings.drawSeconds ?? null,
  );
  const { leaveRoom } = useLeaveRoom();
  const { restartRoom, pending: restarting } = useRestartRoom();

  // A new round:start after this round's end means play resumed: back to the board.
  useEffect(() => {
    if (
      roundEnd &&
      !gameEnd &&
      latestRoundStarted !== null &&
      latestRoundStarted > roundEnd.turn
    ) {
      navigate(gamePath(roomCode), { replace: true });
    }
  }, [roundEnd, gameEnd, latestRoundStarted, roomCode, navigate]);

  // The host pressed "play again": the finished room is a waiting room again,
  // so everybody still on this screen moves to it. The stale table stays in the
  // store until the next `round:end` overwrites it; this screen is gone by then.
  useEffect(() => {
    if (roomStatus !== 'lobby') return;
    navigate(lobbyPath(roomCode), { replace: true });
  }, [roomStatus, roomCode, navigate]);

  const results = useMemo(
    () => (roundEnd ? toTurnResultsViewModel(roundEnd, myId, gameEnd) : null),
    [roundEnd, myId, gameEnd],
  );

  if (!results) return <PageLoading title={t.results.waitingForRound} />;

  const playAgain = async () => {
    const result = await restartRoom();
    // On success the server's `lobby:update` is what moves everybody.
    if (!result.ok) toast.error(result.error.code);
  };

  const leave = () => {
    navigate(PATHS.home, { replace: true });
    void leaveRoom();
  };

  const winner = results.standings[0] ?? null;
  // The reveal is the loudest moment of the turn; this is where "GG" belongs.
  const nameOf = (playerId: string) =>
    results.standings.find((row) => row.playerId === playerId)?.name ?? '—';

  return (
    <div className="grid flex-1 grid-cols-1 gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_380px]">
      <ReactionOverlay nameOf={nameOf} className="fixed inset-x-0 bottom-4" />
      <div className="flex min-w-0 flex-col gap-4.5">
        {results.isFinal && winner ? (
          <FinalBanner
            t={t}
            winnerName={winner.name}
            winnerIsMe={winner.isMe}
            isHost={hostId !== null && hostId === myId}
            restarting={restarting}
            decidedBy={results.decidedBy}
            onPlayAgain={() => void playAgain()}
            onLeave={leave}
          />
        ) : null}
        <div className="flex justify-end">
          <ReactionPicker />
        </div>
        <RoundHeader t={t} results={results} />
        <BreakdownTable t={t} rows={results.rows} />
        {drawSeconds !== null ? (
          <p className="m-0 text-[13px] text-ink-3">{t.results.timeNote(drawSeconds)}</p>
        ) : null}
      </div>
      <StandingsList
        t={t}
        standings={results.standings}
        title={results.isFinal ? t.results.finalTable : t.results.accumulated}
        subtitle={t.results.afterRounds(results.round, results.totalRounds)}
        showDetails={results.isFinal}
      />
    </div>
  );
};
