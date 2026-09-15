import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { TopBar } from '@/shared/components/layout/TopBar';
import { PageLoading } from '@/shared/components/ui/PageState';
import { useT } from '@/shared/i18n';

import { Hero } from '../components/Hero';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { ActiveGameContainer } from '../containers/ActiveGameContainer';
import { HomeContainer } from '../containers/HomeContainer';
import { InviteContainer } from '../containers/InviteContainer';

export const HomePage = () => {
  const t = useT();
  const [searchParams] = useSearchParams();
  const session = useSessionStore((state) => state.session);
  const snapshot = useSessionStore((state) => state.snapshot);
  const bootstrapped = useSessionStore((state) => state.bootstrapped);
  const expired = useSessionStore((state) => state.expired);
  const dismissExpired = useSessionStore((state) => state.dismissExpired);
  // An invitation link opens the reduced view; "create your own room" opts out.
  const [showFullPage, setShowFullPage] = useState(false);
  const invitedCode = (searchParams.get('code') ?? '').trim().toUpperCase();

  // One game at a time: a stored session that is still alive owns this screen.
  const activeGame = session && snapshot && snapshot.lobby.status !== 'finished' ? snapshot : null;

  const notice = expired ? (
    <SessionExpiredNotice
      message={t.common.sessionExpired}
      dismissLabel={t.common.dismiss}
      onDismiss={dismissExpired}
    />
  ) : null;

  if (session && !bootstrapped) {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar bare />
        <PageLoading title={t.common.connecting} />
      </div>
    );
  }

  if (!activeGame && invitedCode && !showFullPage) {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar bare />
        {notice}
        <InviteContainer code={invitedCode} onCreateOwn={() => setShowFullPage(true)} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar bare />
      {notice}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px]">
        <section className="flex flex-col justify-between gap-10 px-4 pt-4 pb-8 sm:px-8 lg:px-16 lg:pt-6 lg:pb-12">
          <Hero t={t.home} />
          <p className="m-0 text-[13px] text-ink-3">{t.home.footer}</p>
        </section>
        <section className="flex flex-col border-t border-line bg-surface px-4 py-8 sm:px-8 lg:border-t-0 lg:border-l lg:px-12 lg:py-10">
          {activeGame ? (
            <ActiveGameContainer
              snapshot={activeGame}
              invitedCode={
                invitedCode && invitedCode !== activeGame.lobby.code ? invitedCode : null
              }
            />
          ) : (
            <HomeContainer />
          )}
        </section>
      </main>
    </div>
  );
};
