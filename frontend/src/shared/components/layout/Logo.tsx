import { Link } from 'react-router-dom';

import { PATHS } from '@/shared/routes/paths';

/** Three-bar mark + wordmark from the mockups' top bar. */
export const Logo = ({ appName }: { appName: string }) => (
  <Link to={PATHS.home} className="flex items-center gap-2.5 text-ink no-underline">
    <span className="flex gap-0.75" aria-hidden="true">
      <span className="h-4.5 w-2.5 rounded-[3px] bg-green" />
      <span className="h-4.5 w-2.5 rounded-[3px] bg-yellow" />
      <span className="h-4.5 w-2.5 rounded-[3px] bg-ink" />
    </span>
    <span className="font-display text-xl font-extrabold tracking-[-0.02em]">{appName}</span>
  </Link>
);
