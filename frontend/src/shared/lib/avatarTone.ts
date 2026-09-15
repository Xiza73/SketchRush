export type AvatarTone = 'accent' | 'green' | 'neutral' | 'yellow' | 'ink' | 'red';

/** Stable per-name tone so the same rival keeps the same colour across screens. */
export const toneForName = (name: string, index: number): AvatarTone => {
  const palette: AvatarTone[] = ['green', 'yellow', 'ink', 'red', 'neutral'];
  const seed = [...name].reduce((sum, char) => sum + char.charCodeAt(0), index);
  return palette[seed % palette.length] ?? 'neutral';
};
