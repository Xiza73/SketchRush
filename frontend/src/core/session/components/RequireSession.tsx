import { Navigate, Outlet, useParams } from 'react-router-dom';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { PageLoading } from '@/shared/components/ui/PageState';
import { useT } from '@/shared/i18n';
import { homeWithCode, PATHS } from '@/shared/routes/paths';

/**
 * Guards room routes: waits for bootstrap, then sends anybody without a session
 * back home. The room code is only pre-filled when the session *expired* — a
 * player who left on purpose must land on the plain home page, not on an
 * invitation to the room they just abandoned.
 */
export const RequireSession = () => {
  const t = useT();
  const { code } = useParams<{ code: string }>();
  const session = useSessionStore((state) => state.session);
  const bootstrapped = useSessionStore((state) => state.bootstrapped);
  const expired = useSessionStore((state) => state.expired);

  if (!bootstrapped) return <PageLoading title={t.common.connecting} />;
  if (!session) return <Navigate to={expired && code ? homeWithCode(code) : PATHS.home} replace />;
  return <Outlet />;
};
