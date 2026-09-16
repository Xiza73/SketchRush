import type { PlayerTurnState } from '@/shared/contract';
import { Avatar } from '@/shared/components/ui/Avatar';
import { PencilIcon } from '@/shared/components/icons/GameIcons';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { toneForName } from '@/shared/lib/avatarTone';

export interface PanelPlayer extends PlayerTurnState {
  name: string;
  connected: boolean;
  isMe: boolean;
  isDrawer: boolean;
  total: number;
  /** 1-based place in the drawing order, which is also this list's order. */
  turnPosition: number;
  /** True for a seat whose turn this round has already been and gone. */
  drawnThisRound: boolean;
}

interface PlayersPanelProps {
  players: PanelPlayer[];
}

/**
 * The running order, which doubles as the scoreboard.
 *
 * The order is drawn once when the game starts and never moves, so this list
 * answers the question everybody actually has — *when is it my turn?* — as well
 * as who is drawing now and who has the word already. A list that only grows as
 * people guess tells you nothing about the ones who have not, and that is most
 * of the tension in a turn.
 */
export const PlayersPanel = ({ players }: PlayersPanelProps) => {
  const t = useT();

  return (
    <section className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-2.5">
      <span className="label px-1">{t.game.drawingOrder}</span>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {players.map((player, index) => (
          <li
            key={player.playerId}
            aria-current={player.isDrawer ? 'true' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors',
              player.guessed
                ? 'border-green bg-green-soft'
                : player.isDrawer
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface',
              !player.connected && 'opacity-55',
              // A seat that has already had its turn this round sinks towards
              // the page rather than lighting up: it is spent, not available.
              player.drawnThisRound && !player.isDrawer && !player.guessed && 'opacity-70',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'w-4 shrink-0 text-center font-mono text-xs font-bold tabular-nums',
                player.isDrawer ? 'text-accent' : 'text-ink-3',
              )}
            >
              {player.turnPosition}
            </span>
            <Avatar name={player.name} tone={toneForName(player.name, index)} size={28} />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold">
                {player.name}
                {player.isMe && (
                  <span className="ml-1 font-normal text-ink-3">({t.common.you})</span>
                )}
              </p>
              <p className="m-0 text-xs text-ink-3">
                {player.isDrawer
                  ? t.game.drawing
                  : player.guessed && player.position !== null
                    ? t.game.guessedAt(player.position)
                    : !player.connected
                      ? t.game.disconnected
                      : player.drawnThisRound
                        ? t.game.alreadyDrew
                        : t.game.stillGuessing}
              </p>
            </div>
            {player.isDrawer ? (
              <PencilIcon size={16} className="shrink-0 text-accent" />
            ) : (
              <span className="shrink-0 font-display text-sm font-bold tabular-nums text-ink-2">
                {player.total}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
