import { ArrowRightIcon, CheckIcon } from '@/shared/components/icons/GameIcons';
import { Button } from '@/shared/components/ui/Button';
import type { Dictionary } from '@/shared/i18n';

interface LobbyActionsProps {
  t: Dictionary;
  isHost: boolean;
  hostName: string;
  isReady: boolean;
  readyCount: number;
  playerCount: number;
  minPlayers: number;
  starting: boolean;
  onToggleReady: () => void;
  onStart: () => void;
  onLeave: () => void;
}

/**
 * Footer of Lobby.dc.html: one row, everything on the same baseline.
 * The status sentence (or the reason the host cannot start yet) lives on the
 * left, so no caption under the buttons can push them out of line.
 * Changing the rules lives next to the settings chips, not here.
 */
export const LobbyActions = ({
  t,
  isHost,
  hostName,
  isReady,
  readyCount,
  playerCount,
  minPlayers,
  starting,
  onToggleReady,
  onStart,
  onLeave,
}: LobbyActionsProps) => {
  const canStart = playerCount >= minPlayers;
  const reason = canStart ? null : t.lobby.needPlayers(minPlayers);
  const status =
    isHost && reason
      ? reason
      : `${t.lobby.readyCount(readyCount, playerCount)} · ${
          isHost ? t.lobby.hostHint : t.lobby.guestHint(hostName)
        }`;

  return (
    // One line when there is room; on narrow screens the sentence keeps its own
    // line instead of being squeezed into a narrow column.
    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <p className="m-0 max-w-120 min-w-60 flex-1 text-sm text-ink-2">{status}</p>
      <div className="ml-auto flex flex-wrap items-center gap-2.5 sm:justify-end">
        <Button variant="outline" size="lg" onClick={onLeave}>
          {t.common.leaveRoom}
        </Button>
        <Button
          variant="outline"
          size="lg"
          aria-pressed={isReady}
          onClick={onToggleReady}
          leading={isReady ? <CheckIcon size={16} /> : undefined}
        >
          {isReady ? t.lobby.notReady : t.lobby.imReady}
        </Button>
        {isHost ? (
          <Button
            size="lg"
            disabled={!canStart}
            loading={starting}
            onClick={onStart}
            trailing={<ArrowRightIcon size={18} />}
            title={reason ?? undefined}
          >
            {starting ? t.lobby.starting : t.lobby.start}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
