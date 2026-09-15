import { Button } from '@/shared/components/ui/Button';
import type { Dictionary } from '@/shared/i18n';

interface FinalBannerProps {
  t: Dictionary;
  winnerName: string;
  winnerIsMe: boolean;
  isHost: boolean;
  restarting: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

/**
 * Banner of the final results. The host is the only one who can start another
 * game in this same room ("Jugar de nuevo"); everybody else reads who they are
 * waiting for and keeps the way out (docs/context/02-game-rules.md ->
 * "Playing again"). At 390 px the actions wrap under the title instead of
 * squeezing it.
 */
export const FinalBanner = ({
  t,
  winnerName,
  winnerIsMe,
  isHost,
  restarting,
  onPlayAgain,
  onLeave,
}: FinalBannerProps) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface px-5 py-4 animate-fade-in">
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="label">{t.results.gameOver}</span>
      <span className="font-display text-2xl font-extrabold tracking-[-0.02em]">
        {winnerIsMe ? t.results.youWin : t.results.winner(winnerName)}
      </span>
    </div>
    {isHost ? (
      <Button size="lg" loading={restarting} onClick={onPlayAgain}>
        {t.results.playAgain}
      </Button>
    ) : (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="m-0 max-w-70 text-sm text-ink-2" role="status">
          {t.results.waitingForHost}
        </p>
        <Button variant="outline" size="lg" onClick={onLeave}>
          {t.common.leaveRoom}
        </Button>
      </div>
    )}
  </div>
);
