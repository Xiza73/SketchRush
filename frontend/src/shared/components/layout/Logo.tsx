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
 * It is the pencil silhouette — a blunt cut end, a barrel, a tapered tip — with
 * every corner softened, rather than either of the two things it is easy to
 * reach for instead. A bare polygon comes out all acute angles and reads hard
 * next to a product whose every other corner is radiused. Rounding *both* ends
 * fixes that and destroys the drawing: a shape with two identical round ends is
 * a capsule, and the asymmetry — flat at one end, pointed at the other — is the
 * entire reason a pencil is recognisable at a glance.
 *
 * Softened by stroking the fill in its own colour with round joins, which is
 * one attribute rather than a second set of hand-placed curves.
 *
 * Mass matters as much as shape: a thin diagonal is the first thing to die at
 * favicon size, and this has to survive 16 px in a browser tab.
 */
const softened = {
  fill: 'currentColor',
  stroke: 'currentColor',
  strokeWidth: 8,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;

export const LogoMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <path d="M40 8 L56 24 L28 52 L10 56 L12 36 Z" {...softened} />
    <path d="M12 36 L28 52 L10 56 Z" className="text-accent" {...softened} />
  </svg>
);

/** Mark + wordmark from the mockups' top bar. */
export const Logo = ({ appName }: { appName: string }) => (
  <Link to={PATHS.home} className="flex items-center gap-2.5 text-ink no-underline">
    <LogoMark size={22} />
    <span className="font-display text-xl font-extrabold tracking-[-0.02em]">{appName}</span>
  </Link>
);
