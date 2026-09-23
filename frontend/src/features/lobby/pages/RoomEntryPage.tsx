import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { TopBar } from '@/shared/components/layout/TopBar';
import { PATHS } from '@/shared/routes/paths';

import { ActiveGameContainer } from '../containers/ActiveGameContainer';
import { InviteContainer } from '../containers/InviteContainer';

/**
 * What a room URL shows to somebody who cannot open it yet: the join view for
 * the code in the address bar, or — with a live session in another room — the
 * "one game at a time" card with "leave it to join CODE".
 *
 * A stored session that turned out to be dead is dropped silently here: the URL
 * carries a code, so there is somewhere to go and no reason for an expiry
 * notice (docs/context/02-game-rules.md -> "Every room URL is an entry point").
 */
export const RoomEntryPage = () => {
  const navigate = useNavigate();
  const { code = '' } = useParams<{ code: string }>();
  const roomCode = code.trim().toUpperCase();
  const session = useSessionStore((state) => state.session);
  const snapshot = useSessionStore((state) => state.snapshot);
  const expired = useSessionStore((state) => state.expired);
  const dismissExpired = useSessionStore((state) => state.dismissExpired);

  useEffect(() => {
    if (expired) dismissExpired();
  }, [expired, dismissExpired]);

  const activeGame =
    session && snapshot && snapshot.lobby.status !== 'finished' && snapshot.lobby.code !== roomCode
      ? snapshot
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar bare />
      {activeGame ? (
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-110">
            <ActiveGameContainer snapshot={activeGame} invitedCode={roomCode} />
          </div>
        </main>
      ) : (
        <InviteContainer code={roomCode} onCreateOwn={() => navigate(PATHS.home)} />
      )}
    </div>
  );
};
