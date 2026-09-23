import { Navigate, Outlet, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { PageLoading } from '@/shared/components/ui/PageState';
import { useT } from '@/shared/i18n';
import { PATHS } from '@/shared/routes/paths';

interface RequireSessionProps {
  /**
   * What to render when the stored session does not open this room: the join
   * view for the code in the URL, or the "game in progress" card when the
   * session belongs to another room. Supplied by `App` so `core/` never
   * imports a feature.
   */
  fallback: ReactNode;
}

/**
 * Guards the room routes. A session for the room in the URL walks through; any
 * other case renders the fallback, which is an entry point and not a dead end:
 * every room URL is shareable (docs/context/02-game-rules.md -> "Every room URL
 * is an entry point").
 */
export const RequireSession = ({ fallback }: RequireSessionProps) => {
  const t = useT();
  const { code } = useParams<{ code: string }>();
  const session = useSessionStore((state) => state.session);
  const bootstrapped = useSessionStore((state) => state.bootstrapped);

  if (!bootstrapped) return <PageLoading title={t.common.connecting} />;
  const wanted = (code ?? '').trim().toUpperCase();
  if (session && (!wanted || session.roomCode === wanted)) return <Outlet />;
  // No code to fall back on (should not happen on these routes): home.
  if (!wanted) return <Navigate to={PATHS.home} replace />;
  return <>{fallback}</>;
};
