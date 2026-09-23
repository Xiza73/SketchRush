import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import type { Dictionary } from '@/shared/i18n';

import { KickedNotice } from './KickedNotice';

interface JoinRoomFormProps {
  t: Dictionary;
  code: string;
  codeError: string | null;
  pending: boolean;
  /** Seconds left of a kick block on this name and code; 0 when there is none. */
  kickedSeconds: number;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
}

export const JoinRoomForm = ({
  t,
  code,
  codeError,
  pending,
  kickedSeconds,
  onCodeChange,
  onSubmit,
}: JoinRoomFormProps) => (
  <form
    className="flex flex-col gap-2.5 border-t border-line pt-6"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <label htmlFor="join-code" className="label">
      {t.home.haveCode}
    </label>
    <div className="flex gap-2">
      <Input
        id="join-code"
        mono
        value={code}
        placeholder={t.home.codePlaceholder}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={8}
        invalid={Boolean(codeError)}
        onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
        className="min-w-0 flex-1"
      />
      <Button
        type="submit"
        variant="outline"
        loading={pending}
        disabled={kickedSeconds > 0}
        className="shrink-0"
      >
        {pending ? t.home.joining : t.home.join}
      </Button>
    </div>
    {codeError ? (
      <p role="alert" className="m-0 text-xs font-semibold text-red">
        {codeError}
      </p>
    ) : null}
    {kickedSeconds > 0 ? <KickedNotice message={t.home.kickedWait(kickedSeconds)} /> : null}
  </form>
);
