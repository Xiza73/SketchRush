import type { Emote } from '@/shared/contract';
import { cn } from '@/shared/lib/cn';

import { customEmoteUrl } from './customEmotes';

interface EmoteIconProps {
  emote: Emote;
  size?: number;
  className?: string;
  /**
   * When given, the sticker is content rather than decoration: it becomes the
   * `alt` of the image (the feed message, the phone overlay). Without it the
   * icon stays hidden from assistive tech and the caller labels the button.
   */
  label?: string;
  /** Fired once the artwork is painted, so the feed can re-scroll to the end. */
  onLoad?: () => void;
}

/**
 * One of the twenty emote stickers. The artwork is raster (see the README in
 * `src/assets/emotes/`), so it is never recoloured with `currentColor`; an
 * emote whose file is not in the folder yet falls back to a neutral square
 * with its initial, which keeps the picker usable while the art is produced.
 */
export const EmoteIcon = ({ emote, size = 24, className, label, onLoad }: EmoteIconProps) => {
  const custom = customEmoteUrl(emote);
  if (custom) {
    return (
      <img
        src={custom}
        width={size}
        height={size}
        alt={label ?? ''}
        aria-hidden={label ? undefined : 'true'}
        draggable={false}
        onLoad={onLoad}
        className={className}
        style={{ display: 'block', objectFit: 'contain' }}
      />
    );
  }
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      className={cn(
        'flex select-none items-center justify-center rounded-[28%] bg-surface-2 font-semibold text-ink-3 uppercase',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5), lineHeight: 1 }}
    >
      {emote[0]}
    </span>
  );
};
