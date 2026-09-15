import { PencilIcon } from '@/shared/components/icons/GameIcons';
import { SCORING } from '@/shared/contract';
import type { Dictionary } from '@/shared/i18n';

/**
 * Three doodles that draw themselves, one after another, forever.
 *
 * Each stroke is a `<path>` with `pathLength="1"`, so the dash animation that
 * reveals it needs no measuring — one keyframe serves every path whatever its
 * real length. The stagger is an inline `animationDelay` rather than a wall of
 * `nth-child` rules: the timing is data, and it belongs next to the data.
 */
const DOODLES: readonly (readonly { d: string; ink: string }[])[] = [
  // A house.
  [
    { d: 'M14 54 L50 22 L86 54', ink: 'var(--ink)' },
    { d: 'M22 50 L22 84 L78 84 L78 50', ink: 'var(--ink)' },
    { d: 'M42 84 L42 64 L58 64 L58 84', ink: 'var(--accent)' },
    { d: 'M60 30 L60 16 L70 16 L70 38', ink: 'var(--red)' },
  ],
  // A cat.
  [
    { d: 'M26 46 C26 26 74 26 74 46 C74 74 26 74 26 46', ink: 'var(--ink)' },
    { d: 'M31 33 L27 15 L45 26 M69 33 L73 15 L55 26', ink: 'var(--ink)' },
    { d: 'M41 46 L41 52 M59 46 L59 52', ink: 'var(--accent)' },
    { d: 'M42 60 Q50 67 58 60', ink: 'var(--green)' },
  ],
  // A sailboat.
  [
    { d: 'M16 72 L84 72 L70 88 L30 88 Z', ink: 'var(--ink)' },
    { d: 'M50 70 L50 16', ink: 'var(--ink)' },
    { d: 'M54 20 L80 66 L54 66 Z', ink: 'var(--yellow)' },
    { d: 'M46 30 L24 66 L46 66 Z', ink: 'var(--accent)' },
  ],
];

/**
 * Seconds per doodle and the head start between its strokes. The keyframe's
 * percentages are cut to match: a stroke is gone by 4.2 s, so the last one of a
 * doodle (0.6 s of stagger behind the first) clears at 4.8 s and the next
 * doodle begins at 5 — a beat between them, not a hole.
 */
const SLOT = 5;
const STAGGER = 0.2;
const LOOP = DOODLES.length * SLOT;

interface HeroProps {
  t: Dictionary['home'];
}

export const Hero = ({ t }: HeroProps) => {
  const [line1, line2] = t.headline.split('\n');
  return (
    <div className="flex flex-col gap-7">
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="sketch h-28 w-28 shrink-0"
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {DOODLES.map((doodle, frame) =>
          doodle.map((stroke, index) => (
            <path
              key={`${frame}-${index}`}
              // The doodle a reader who asked for no motion gets, standing still.
              className={frame === 0 ? 'sketch-still' : undefined}
              d={stroke.d}
              stroke={stroke.ink}
              pathLength={1}
              style={{
                animationDuration: `${LOOP}s`,
                animationDelay: `${frame * SLOT + index * STAGGER}s`,
              }}
            />
          )),
        )}
      </svg>

      <h1 className="m-0 font-display text-[clamp(40px,7vw,72px)] leading-[0.98] font-extrabold tracking-[-0.03em] text-balance">
        {line1}
        <br />
        {line2}
      </h1>
      <p className="m-0 max-w-140 text-[17px] leading-normal text-ink-2 text-pretty sm:text-[19px]">
        {t.lede}
      </p>

      <div className="grid max-w-180 grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-4.5">
          <div className="font-mono text-lg font-bold text-green-ink">
            {SCORING.positionBonus.map((bonus) => `+${bonus}`).join(' ')}
          </div>
          <div className="text-[15px] font-bold">{t.feature1Title}</div>
          <div className="text-[13px] leading-[1.45] text-ink-2">{t.feature1Body}</div>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-4.5">
          <div className="text-accent">
            <PencilIcon size={20} />
          </div>
          <div className="text-[15px] font-bold">{t.feature2Title}</div>
          <div className="text-[13px] leading-[1.45] text-ink-2">{t.feature2Body}</div>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-4.5">
          <div className="flex gap-1" aria-hidden="true">
            <span className="h-4.5 w-9 rounded bg-surface-2 ring-1 ring-line" />
            <span className="h-4.5 w-9 rounded bg-accent" />
            <span className="h-4.5 w-9 rounded bg-surface-2 ring-1 ring-line" />
          </div>
          <div className="text-[15px] font-bold">{t.feature3Title}</div>
          <div className="text-[13px] leading-[1.45] text-ink-2">{t.feature3Body}</div>
        </div>
      </div>
    </div>
  );
};
