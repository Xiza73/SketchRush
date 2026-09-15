import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { ROOM_LIMITS } from '@/shared/contract';
import type { Dictionary } from '@/shared/i18n';

interface InviteJoinCardProps {
  t: Dictionary;
  code: string;
  name: string;
  nameError: string | null;
  pending: boolean;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onCreateOwn: () => void;
}

/**
 * What `/?code=XXXX` shows: the room code and one name field. No hero and no
 * create form — whoever follows an invitation is here to join
 * (docs/context/02-game-rules.md -> "Room").
 */
export const InviteJoinCard = ({
  t,
  code,
  name,
  nameError,
  pending,
  onNameChange,
  onSubmit,
  onCreateOwn,
}: InviteJoinCardProps) => (
  <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
    <form
      className="flex w-full max-w-110 flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="m-0 font-display text-[clamp(28px,7vw,38px)] font-extrabold tracking-[-0.02em]">
          {t.home.inviteTitle}
        </h1>
        <p className="m-0 max-w-90 text-[15px] leading-normal text-ink-2 text-pretty">
          {t.home.inviteSubtitle}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="label">{t.home.inviteCodeLabel}</span>
        <span className="rounded-xl border border-line bg-surface-2 px-6 py-3 font-mono text-[clamp(28px,9vw,40px)] leading-none font-bold tracking-[0.12em]">
          {code}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-name" className="label">
          {t.home.yourName}
        </label>
        <Input
          id="invite-name"
          autoFocus
          value={name}
          maxLength={ROOM_LIMITS.nameMaxLength}
          autoComplete="nickname"
          placeholder={t.home.namePlaceholder}
          invalid={Boolean(nameError)}
          onChange={(event) => onNameChange(event.target.value)}
        />
        {nameError ? (
          <p role="alert" className="m-0 text-xs font-semibold text-red">
            {nameError}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? t.home.joining : t.home.join}
      </Button>

      <button
        type="button"
        onClick={onCreateOwn}
        className="m-0 self-center text-[13px] font-semibold text-ink-3 underline underline-offset-4 hover:text-ink"
      >
        {t.home.createOwn}
      </button>
    </form>
  </main>
);
