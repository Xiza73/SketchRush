import { HintIcon } from '@/shared/components/icons/GameIcons';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Segmented } from '@/shared/components/ui/Segmented';
import { Stepper } from '@/shared/components/ui/Stepper';
import { ROOM_LIMITS, type GuessMode, type Language } from '@/shared/contract';
import type { Dictionary } from '@/shared/i18n';

import type { CreateRoomForm as CreateRoomFormValues } from '../api/create-room/create-room.dto';
import { sessionMinutes } from '../helpers/sessionLength';

interface CreateRoomFormProps {
  t: Dictionary;
  values: CreateRoomFormValues;
  nameError: string | null;
  pending: boolean;
  onChange: (patch: Partial<CreateRoomFormValues>) => void;
  onSubmit: () => void;
}

export const CreateRoomForm = ({
  t,
  values,
  nameError,
  pending,
  onChange,
  onSubmit,
}: CreateRoomFormProps) => (
  <form
    className="flex flex-col gap-6"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <div className="flex flex-col gap-1.5">
      <h2 className="m-0 font-display text-[30px] font-bold tracking-[-0.02em]">
        {t.home.createTitle}
      </h2>
      <p className="m-0 text-sm text-ink-2">{t.home.createSubtitle}</p>
    </div>

    <div className="flex flex-col gap-2">
      <label htmlFor="create-name" className="label">
        {t.home.yourName}
      </label>
      <Input
        id="create-name"
        value={values.name}
        maxLength={ROOM_LIMITS.nameMaxLength}
        autoComplete="nickname"
        placeholder={t.home.namePlaceholder}
        invalid={Boolean(nameError)}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      {nameError ? (
        <p role="alert" className="m-0 text-xs font-semibold text-red">
          {nameError}
        </p>
      ) : null}
    </div>

    <div className="flex flex-col gap-2">
      <span className="label">{t.home.wordLanguage}</span>
      <Segmented<Language>
        label={t.home.wordLanguage}
        value={values.language}
        onChange={(language) => onChange({ language })}
        options={[
          { value: 'es', label: t.common.language.es },
          { value: 'en', label: t.common.language.en },
        ]}
      />
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label">{t.home.initialTime}</span>
        <span className="text-xs text-ink-3">
          {t.home.minimumTime(ROOM_LIMITS.minDrawSeconds)}
        </span>
      </div>
      <Segmented<number>
        mono
        label={t.home.initialTime}
        value={values.drawSeconds}
        onChange={(drawSeconds) => onChange({ drawSeconds })}
        options={ROOM_LIMITS.drawSecondsOptions.map((seconds) => ({
          value: seconds,
          label: t.common.seconds(seconds),
        }))}
      />
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <span className="label">{t.home.rounds}</span>
        <Segmented<number>
          mono
          label={t.home.rounds}
          value={values.rounds}
          onChange={(rounds) => onChange({ rounds })}
          className="gap-1.5!"
          options={ROOM_LIMITS.roundsOptions.map((rounds) => ({
            value: rounds,
            label: String(rounds),
          }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="label">{t.home.players}</span>
        <Stepper
          label={t.home.players}
          value={values.capacity}
          min={ROOM_LIMITS.minPlayers}
          max={ROOM_LIMITS.maxPlayers}
          onChange={(capacity) => onChange({ capacity })}
          decrementLabel={t.home.fewerPlayers}
          incrementLabel={t.home.morePlayers}
        />
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <span className="label">{t.home.guessMode}</span>
      <Segmented<GuessMode>
        label={t.home.guessMode}
        value={values.guessMode}
        onChange={(guessMode) => onChange({ guessMode })}
        options={[
          { value: 'box', label: t.home.guessModeBox },
          { value: 'chat', label: t.home.guessModeChat },
        ]}
      />
      <span className="text-xs text-ink-3">
        {values.guessMode === 'box' ? t.home.guessModeBoxNote : t.home.guessModeChatNote}
      </span>
    </div>

    <div className="rounded-xl border border-yellow-line bg-yellow-soft px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-yellow-deep">
          <HintIcon size={18} />
          <span className="text-sm font-semibold">{t.home.hints}</span>
        </div>
        <Segmented<boolean>
          size="sm"
          label={t.home.hints}
          value={values.hints}
          onChange={(hints) => onChange({ hints })}
          options={[
            { value: true, label: t.home.hintsOn },
            { value: false, label: t.home.hintsOff },
          ]}
        />
      </div>
      {values.hints && <p className="m-0 mt-2.5 text-xs text-ink-3">{t.home.hintsNote}</p>}
    </div>

    <p className="m-0 text-xs text-ink-3">{t.home.sessionLength(sessionMinutes(values))}</p>

    <Button type="submit" size="lg" loading={pending} className="w-full">
      {pending ? t.home.creating : t.home.create}
    </Button>
  </form>
);
