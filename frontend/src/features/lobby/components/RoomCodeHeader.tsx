import { CopyIcon, SlidersIcon } from '@/shared/components/icons/GameIcons';
import { Button } from '@/shared/components/ui/Button';
import type { RoomSettings } from '@/shared/contract';
import type { Dictionary } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

interface RoomCodeHeaderProps {
  t: Dictionary;
  code: string;
  settings: RoomSettings;
  playerCount: number;
  isHost: boolean;
  onCopyLink: () => void;
  /** Host only: opens the room rules dialog. */
  onChangeRules: () => void;
}

const chipClass =
  'flex h-8.5 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold';

interface ChipProps {
  value: string;
  caption?: string;
  muted?: boolean;
  /** Numbers read in mono; words (the language name) do not. */
  mono?: boolean;
  /** Set for the host: the whole chip opens the rules dialog. */
  onClick?: () => void;
  title?: string;
}

/** A settings chip; a button when the host can edit the rules, plain text otherwise. */
const Chip = ({ value, caption, muted, mono = true, onClick, title }: ChipProps) => {
  const body = (
    <>
      <span className={mono ? 'font-mono' : undefined}>{value}</span>
      {caption ? <span className="font-medium text-ink-2">{caption}</span> : null}
    </>
  );
  const className = cn(chipClass, muted && 'font-medium text-ink-2');
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(className, 'cursor-pointer transition-colors hover:border-accent')}
    >
      {body}
    </button>
  ) : (
    <span className={className}>{body}</span>
  );
};

export const RoomCodeHeader = ({
  t,
  code,
  settings,
  playerCount,
  isHost,
  onCopyLink,
  onChangeRules,
}: RoomCodeHeaderProps) => {
  // Host only: the chips and the button next to them open the same dialog, so
  // the rules are edited where they are read instead of down in the footer.
  const edit = isHost ? onChangeRules : undefined;
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-2.5">
        <span className="label">{t.lobby.roomCode}</span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono text-[clamp(48px,10vw,72px)] leading-none font-bold tracking-[0.12em]">
            {code}
          </span>
          <Button variant="outline" size="sm" onClick={onCopyLink} leading={<CopyIcon size={18} />}>
            {t.common.copyLink}
          </Button>
        </div>
        <span className="text-sm text-ink-2">{t.lobby.shareHint}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Chip
            value={t.common.language[settings.language]}
            mono={false}
            onClick={edit}
            title={isHost ? t.lobby.changeRules : undefined}
          />
          <Chip
            value={t.common.seconds(settings.drawSeconds)}
            caption={t.common.perRound}
            onClick={edit}
            title={isHost ? t.lobby.changeRules : undefined}
          />
          <Chip
            value={String(settings.rounds)}
            caption={t.common.rounds}
            onClick={edit}
            title={isHost ? t.lobby.changeRules : undefined}
          />
          <Chip
            value={t.lobby.playersChip(playerCount, settings.capacity)}
            caption={t.common.players}
            onClick={edit}
            title={isHost ? t.lobby.changeRules : undefined}
          />
          {settings.hintLetters === 0 ? (
            <Chip
              value={t.lobby.hintOff}
              muted
              mono={false}
              onClick={edit}
              title={isHost ? t.lobby.changeRules : undefined}
            />
          ) : null}
        </div>
        {isHost ? (
          <Button
            variant="accent-outline"
            size="sm"
            onClick={onChangeRules}
            leading={<SlidersIcon size={16} />}
          >
            {t.lobby.changeRules}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
