import type { ReactNode } from 'react';

interface PageStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

const Spinner = () => (
  <span
    aria-hidden="true"
    className="h-8 w-8 animate-spin rounded-full border-3 border-line border-t-accent"
  />
);

export const PageLoading = ({ title }: { title: string }) => (
  <div
    role="status"
    className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-ink-2"
  >
    <Spinner />
    <span className="text-sm font-medium">{title}</span>
  </div>
);

export const PageEmpty = ({ title, body, action }: PageStateProps) => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
    <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">{title}</h2>
    {body ? <p className="max-w-md text-sm text-ink-2">{body}</p> : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);
