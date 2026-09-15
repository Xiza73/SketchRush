import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { RequireSession } from '@/core/session/components/RequireSession';
import { SessionReplacedOverlay } from '@/core/session/components/SessionReplacedOverlay';
import { useSessionBootstrap } from '@/core/session/hooks/useSessionBootstrap';
import { GamePage } from '@/features/game/pages/GamePage';
import { useTurnStore } from '@/features/game/stores/useTurnStore';
import { useLobbyStore } from '@/features/lobby/stores/useLobbyStore';
import { HomePage } from '@/features/lobby/pages/HomePage';
import { LobbyPage } from '@/features/lobby/pages/LobbyPage';
import { useReactionsStore } from '@/features/reactions/stores/useReactionsStore';
import { useResultsStore } from '@/features/results/stores/useResultsStore';
import { ResultsPage } from '@/features/results/pages/ResultsPage';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { PageEmpty } from '@/shared/components/ui/PageState';
import { TopBar } from '@/shared/components/layout/TopBar';
import { useT } from '@/shared/i18n';
import { PATHS } from '@/shared/routes/paths';

const NotFoundPage = () => {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col">
      <TopBar bare />
      <PageEmpty
        title="404"
        body={t.common.notFound}
        action={
          <Button
            onClick={() => {
              window.location.assign(PATHS.home);
            }}
          >
            {t.common.backHome}
          </Button>
        }
      />
    </div>
  );
};

/** Binds every socket-driven store once, then bootstraps the stored session. */
const Bootstrap = () => {
  useEffect(() => {
    useLobbyStore.getState().bind();
    useTurnStore.getState().bind();
    useReactionsStore.getState().bind();
    useResultsStore.getState().bind();
  }, []);
  useSessionBootstrap();
  return null;
};

export const App = () => (
  <BrowserRouter>
    <Bootstrap />
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={PATHS.home} element={<HomePage />} />
        <Route element={<RequireSession />}>
          <Route path={PATHS.lobby} element={<LobbyPage />} />
          <Route path={PATHS.game} element={<GamePage />} />
          <Route path={PATHS.results} element={<ResultsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    <SessionReplacedOverlay />
  </BrowserRouter>
);
