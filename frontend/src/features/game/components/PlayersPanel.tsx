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
}

interface PlayersPanelProps {
  players: PanelPlayer[];
}

/**
 * Everybody at the table, in one place: who is drawing, who has it already and
 * in what order. A list that only grows as people guess tells you nothing about
 * the ones who have not, and that is most of the tension in the turn.
 */
export const PlayersPanel = ({ players }: PlayersPanelProps) => {
  const t = useT();

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {players.map((player, index) => (
        <li
          key={player.playerId}
          className={cn(
            'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors',
            player.guessed
              ? 'border-green bg-green-soft'
              : player.isDrawer
                ? 'border-accent bg-accent-soft'
                : 'border-line bg-surface',
            !player.connected && 'opacity-55',
          )}
        >
          <Avatar name={player.name} tone={toneForName(player.name, index)} size={28} />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-sm font-semibold">
              {player.name}
              {player.isMe && <span className="ml-1 font-normal text-ink-3">({t.common.you})</span>}
            </p>
            <p className="m-0 text-xs text-ink-3">
              {player.isDrawer
                ? t.game.drawing
                : player.guessed && player.position !== null
                  ? t.game.guessedAt(player.position)
                  : !player.connected
                    ? t.game.disconnected
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
  );
};
