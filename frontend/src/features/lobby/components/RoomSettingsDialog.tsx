import { useEffect, useState } from 'react';

import { HintIcon } from '@/shared/components/icons/GameIcons';
import { Button } from '@/shared/components/ui/Button';
import { Segmented } from '@/shared/components/ui/Segmented';
import { Stepper } from '@/shared/components/ui/Stepper';
import { ROOM_LIMITS, type Language, type RoomSettings } from '@/shared/contract';
import type { Dictionary } from '@/shared/i18n';

interface RoomSettingsDialogProps {
  t: Dictionary;
  open: boolean;
  settings: RoomSettings;
  /** The room never shrinks below the players already seated. */
  playerCount: number;
  pending: boolean;
  onCancel: () => void;
  onSave: (settings: RoomSettings) => void;
}

/**
 * Host-only edit of the room rules from the lobby (Lobby.dc.html footer,
 * "Cambiar reglas"). Same controls as the create-room form; the capacity
 * stepper's floor is the current player count, which the server enforces too.
 * Escape and a click outside cancel, like `ConfirmDialog`.
 */
export const RoomSettingsDialog = ({
  t,
  open,
  settings,
  playerCount,
  pending,
  onCancel,
  onSave,
}: RoomSettingsDialogProps) => {
  const [values, setValues] = useState<RoomSettings>(settings);

  // Re-prefill every time it opens, and follow a rival edit while it is closed.
  useEffect(() => {
    if (open) setValues(settings);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const minCapacity = Math.max(ROOM_LIMITS.minPlayers, playerCount);
  const patch = (next: Partial<RoomSettings>) => setValues((current) => ({ ...current, ...next }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8"
      onClick={onCancel}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t.lobby.rulesTitle}
        className="my-auto flex w-full max-w-110 flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-xl animate-fade-in"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 font-display text-xl font-extrabold tracking-[-0.02em]">
            {t.lobby.rulesTitle}
          </h2>
          <p className="m-0 text-sm text-ink-2">{t.lobby.rulesSubtitle}</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="label">{t.home.wordLanguage}</span>
          <Segmented<Language>
            label={t.home.wordLanguage}
            value={values.language}
            onChange={(language) => patch({ language })}
            options={[
              { value: 'es', label: t.common.language.es },
              { value: 'en', label: t.common.language.en },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label">{t.home.initialTime}</span>
            <span className="text-xs text-ink-3">
              {t.home.minimumTime(ROOM_LIMITS.minDrawSeconds)}
            </span>
          </div>
          <Segmented<number>
            mono
            size="sm"
            label={t.home.initialTime}
            value={values.drawSeconds}
            onChange={(drawSeconds) => patch({ drawSeconds })}
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
              onChange={(rounds) => patch({ rounds })}
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
              min={minCapacity}
              max={ROOM_LIMITS.maxPlayers}
              onChange={(capacity) => patch({ capacity })}
              decrementLabel={t.home.fewerPlayers}
              incrementLabel={t.home.morePlayers}
            />
            {minCapacity > ROOM_LIMITS.minPlayers ? (
              <span className="text-xs text-ink-3">{t.lobby.rulesMinCapacity(minCapacity)}</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-line bg-yellow-soft px-4 py-3.5">
          <div className="flex items-center gap-2.5 text-yellow-deep">
            <HintIcon size={18} />
            <span className="text-sm font-semibold">{t.home.hintLetters}</span>
          </div>
          <Segmented<number>
            mono
            size="sm"
            label={t.home.hintLetters}
            value={values.hintLetters}
            onChange={(hintLetters) => patch({ hintLetters })}
            options={ROOM_LIMITS.hintLettersOptions.map((n) => ({
              value: n,
              label: n === 0 ? t.home.hintNone : String(n),
            }))}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button type="submit" variant="ink" loading={pending}>
            {pending ? t.lobby.savingRules : t.lobby.saveRules}
          </Button>
        </div>
      </form>
    </div>
  );
};
