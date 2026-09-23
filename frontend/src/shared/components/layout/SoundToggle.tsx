import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Toggle } from '@/shared/components/ui/Toggle';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { playSound } from '@/shared/lib/sound';
import { useUiStore } from '@/shared/stores/useUiStore';

/**
 * Speaker button in the top bar. A click opens the sound settings: mute, the
 * master volume and the keyboard tick, which is off by default
 * (docs/context/02-game-rules.md -> Sound).
 */
export const SoundToggle = () => {
  const t = useT();
  const muted = useUiStore((state) => state.muted);
  const volume = useUiStore((state) => state.volume);
  const keyboardSounds = useUiStore((state) => state.keyboardSounds);
  const toggleMuted = useUiStore((state) => state.toggleMuted);
  const setVolume = useUiStore((state) => state.setVolume);
  const setKeyboardSounds = useUiStore((state) => state.setKeyboardSounds);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div ref={rootRef} className="relative flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t.common.soundSettings}
        title={t.common.soundSettings}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-surface-2 text-ink transition-colors hover:bg-line',
          open && 'bg-line',
        )}
      >
        <Icon size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="animate-emote-pop absolute top-full right-0 z-50 mt-2 flex w-64 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-pop"
        >
          <span id={titleId} className="label">
            {t.common.soundSettings}
          </span>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{t.common.sound}</span>
            <Toggle
              checked={!muted}
              onChange={toggleMuted}
              label={muted ? t.common.soundOn : t.common.soundOff}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sound-volume" className="flex items-center justify-between text-sm">
              <span className="font-semibold">{t.common.volume}</span>
              <span className="font-mono text-xs text-ink-2 tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </label>
            <input
              id="sound-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(volume * 100)}
              disabled={muted}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
              // The slider is also the preview: every release plays a cue at
              // the level just chosen.
              onPointerUp={() => playSound('playerJoined')}
              onKeyUp={() => playSound('playerJoined')}
              className="w-full accent-[var(--color-accent)] disabled:opacity-40"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t.common.keyboardSounds}</span>
            <Toggle
              checked={keyboardSounds}
              onChange={setKeyboardSounds}
              label={t.common.keyboardSounds}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
