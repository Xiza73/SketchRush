import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import type { Dictionary } from '@/shared/i18n';

interface ActiveGameCardProps {
  t: Dictionary;
  code: string;
  /** "Sala de espera", "Ronda 2 de 3" or "Resultados". */
  stage: string;
  /** Code of the invitation the player would have to abandon this game for. */
  invitedCode?: string | null;
  onResume: () => void;
  onLeave: () => void;
}

/**
 * Home page with a live session: one game at a time
 * (docs/context/02-game-rules.md -> "One game at a time"). No create/join
 * forms until the player resumes the game or abandons it.
 */
export const ActiveGameCard = ({
  t,
  code,
  stage,
  invitedCode,
  onResume,
  onLeave,
}: ActiveGameCardProps) => (
  <Card className="flex flex-col gap-5 p-6 sm:p-7">
    <div className="flex flex-col gap-1.5">
      <span className="label">{t.home.activeTitle}</span>
      <span className="font-display text-4xl font-extrabold tracking-[0.08em]">{code}</span>
      <span className="text-sm text-ink-2">{stage}</span>
    </div>
    <p className="m-0 text-sm text-ink-2">
      {t.home.activeBody}
      {invitedCode ? (
        <>
          {' '}
          <strong className="text-ink">{t.home.leaveItToJoin(invitedCode)}</strong>
        </>
      ) : null}
    </p>
    <div className="flex flex-wrap gap-2.5">
      <Button size="lg" onClick={onResume}>
        {t.home.resume}
      </Button>
      <Button variant="outline" size="lg" onClick={onLeave}>
        {t.home.leaveIt}
      </Button>
    </div>
  </Card>
);
