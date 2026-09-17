import { Link } from 'react-router-dom';

import { PATHS } from '@/shared/routes/paths';

/**
 * The mark: a pencil, body in ink and tip in the accent.
 *
 * It replaces the three bars this game inherited from its sibling. There those
 * bars are the game — green for a correct letter, yellow for a present one, ink
 * for an absent one — and here they were three coloured rectangles meaning
 * nothing, built out of the two colours the design system reserves for right
 * and wrong and forbids using as decoration. A drawing game's mark should say
 * *drawing*; the family shows in the type, the tokens and everything around it.
 *
 * Drawn corner to corner on purpose. A thin diagonal is the first thing to die
 * at favicon size, and this has to survive 16 px in a browser tab.
 */
export const LogoMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <path d="M42 2 L62 22 L24 60 L2 62 L4 40 Z" fill="currentColor" />
    <path d="M4 40 L24 60 L2 62 Z" className="text-accent" fill="currentColor" />
  </svg>
);

/** Mark + wordmark from the mockups' top bar. */
export const Logo = ({ appName }: { appName: string }) => (
  <Link to={PATHS.home} className="flex items-center gap-2.5 text-ink no-underline">
    <LogoMark size={22} />
    <span className="font-display text-xl font-extrabold tracking-[-0.02em]">{appName}</span>
  </Link>
);
