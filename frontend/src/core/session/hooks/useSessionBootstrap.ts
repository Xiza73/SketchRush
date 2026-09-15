import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { pathForStatus, PATHS } from '@/shared/routes/paths';

/**
 * On first mount: bind socket listeners and, when a session is stored, rejoin
 * the room. Runs once (StrictMode-safe).
 *
 * Landing on the home page is the one case where a live session must **not**
 * hijack the navigation: the page shows the "game in progress" card and lets
 * the player choose (docs/context/02-game-rules.md -> "One game at a time").
 * A dead session is dropped quietly there too; the expiry notice is for
 * somebody who was thrown out of a room, not for a plain visit.
 */
export const useSessionBootstrap = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const atHome = pathname === PATHS.home;

    const store = useSessionStore.getState();
    store.bind();

    if (!store.session) {
      store.markBootstrapped();
      return;
    }

    // `initial` marks the re-entry rejoin: a finished room expires the session
    // instead of restoring it.
    void store.rejoin({ initial: true, quiet: atHome }).then((state) => {
      if (state && !atHome) {
        navigate(pathForStatus(state.lobby.status, state.lobby.code), { replace: true });
      }
      useSessionStore.getState().markBootstrapped();
    });
  }, [navigate, pathname]);
};
