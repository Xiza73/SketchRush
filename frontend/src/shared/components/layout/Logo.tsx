import { Link } from 'react-router-dom';

import { PATHS } from '@/shared/routes/paths';

/**
 * The mark: a pencil, barrel in ink and nib in the accent.
 *
 * It replaces the three bars this game inherited from its sibling. There those
 * bars are the game — green for a correct letter, yellow for a present one, ink
 * for an absent one — and here they were three coloured rectangles meaning
 * nothing, built out of the two colours the design system reserves for right
 * and wrong and forbids using as decoration. A drawing game's mark should say
 * *drawing*; the family shows in the type, the tokens and everything around it.
 *
 * Two round-capped strokes rather than a polygon, which is the same vocabulary
 * as the hero's doodles and the house icon spec — `round caps and joins`, on
 * everything. A pencil drawn as a silhouette comes out all acute angles and
 * reads sharp next to a product whose every other corner is radiused.
 *
 * The nib is narrower than the barrel on purpose: at the same width the whole
 * thing reads as a capsule rather than as something that draws. And the mass
 * matters as much as the shape — a thin diagonal is the first thing to die at
 * favicon size, and this has to survive 16 px in a browser tab.
 */
export const LogoMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" strokeLinecap="round">
    <path d="M48 16 L25 39" stroke="currentColor" strokeWidth={23} />
    <path d="M18 46 L15 49" className="text-accent" stroke="currentColor" strokeWidth={17} />
  </svg>
);

/** Mark + wordmark from the mockups' top bar. */
export const Logo = ({ appName }: { appName: string }) => (
  <Link to={PATHS.home} className="flex items-center gap-2.5 text-ink no-underline">
    <LogoMark size={22} />
    <span className="font-display text-xl font-extrabold tracking-[-0.02em]">{appName}</span>
  </Link>
);
