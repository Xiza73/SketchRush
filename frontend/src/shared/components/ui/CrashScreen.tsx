import { useT } from '@/shared/i18n';

import { Button } from './Button';
import { PageEmpty } from './PageState';

/**
 * What `ErrorBoundary` shows once something below it threw. Its own file so it
 * can read the dictionary — a class cannot call `useT` — and it deliberately
 * uses neither the router nor the `TopBar`: either of them may be what threw.
 */
export const CrashScreen = () => {
  const t = useT();
  return (
    <div className="flex min-h-full flex-col justify-center bg-bg text-ink">
      <PageEmpty
        title={t.common.crashTitle}
        body={t.common.crashBody}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => {
                window.location.reload();
              }}
            >
              {t.common.reload}
            </Button>
            {/* Reloading a route that throws on render throws again; going home
                is the way out of a screen that is broken for good. */}
            <Button
              variant="outline"
              onClick={() => {
                window.location.assign('/');
              }}
            >
              {t.common.backHome}
            </Button>
          </div>
        }
      />
    </div>
  );
};
