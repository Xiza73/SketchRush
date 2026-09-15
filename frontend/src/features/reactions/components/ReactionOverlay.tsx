import { EmoteIcon } from '@/shared/components/icons/EmoteIcon';
import { Avatar } from '@/shared/components/ui/Avatar';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { toneForName } from '@/shared/lib/avatarTone';

import { useReactionsStore } from '../stores/useReactionsStore';

interface ReactionOverlayProps {
  /** Resolves ids to names; a sticker without a sender is just noise. */
  nameOf: (playerId: string) => string;
  /**
   * Where the row sits. The two screens want different anchors — over the
   * drawing on one, pinned to the viewport on the other — so placement is the
   * caller's call and this component only draws the stickers.
   */
  className?: string;
}

/**
 * The stickers the room is throwing, wherever the caller puts them.
 *
 * `pointer-events-none` throughout: on the game screen this sits on top of the
 * canvas, and the drawer has to be able to draw straight through it.
 */
export const ReactionOverlay = ({ nameOf, className }: ReactionOverlayProps) => {
  const t = useT();
  const live = useReactionsStore((state) => state.live);
  if (live.length === 0) return null;

  return (
    <div
      className={cn(
        'pointer-events-none z-20 flex flex-wrap items-end justify-center gap-2 p-3',
        className,
      )}
    >
      {live.map((reaction, index) => {
        const name = nameOf(reaction.playerId);
        return (
          <div
            key={reaction.id}
            className="flex flex-col items-center gap-1 animate-sticker-flash"
          >
            <EmoteIcon emote={reaction.emote} size={44} label={t.emotes[reaction.emote]} />
            <span className="flex max-w-24 items-center gap-1 rounded-full bg-ink/85 px-1.5 py-0.5 text-[11px] font-semibold text-on-ink">
              <Avatar name={name} tone={toneForName(name, index)} size={14} />
              <span className="truncate">{name}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
