import { editDistance, normalizeWord } from './normalize-word';

describe('normalizeWord', () => {
  it('drops accents', () => {
    expect(normalizeWord('león')).toBe('leon');
    expect(normalizeWord('plátano')).toBe('platano');
  });

  it('drops the tilde on ñ as well', () => {
    // Looser than WordRush on purpose: you type this against a clock.
    expect(normalizeWord('araña')).toBe('arana');
    expect(normalizeWord('montaña')).toBe('montana');
  });

  it('drops a diaeresis', () => {
    expect(normalizeWord('pingüino')).toBe('pinguino');
  });

  it('lower-cases and trims', () => {
    expect(normalizeWord('  CASA  ')).toBe('casa');
  });

  it('throws away punctuation and collapses spaces', () => {
    expect(normalizeWord('¡el  Sol!')).toBe('el sol');
  });

  it('makes every spelling of one word the same string', () => {
    const forms = ['araña', 'ARAÑA', ' Arana ', '¿araña?'];
    expect(new Set(forms.map(normalizeWord)).size).toBe(1);
  });
});

describe('editDistance', () => {
  it('is 0 for the same word', () => {
    expect(editDistance('gato', 'gato')).toBe(0);
  });

  it('counts one substitution, one insertion and one deletion as 1', () => {
    expect(editDistance('gato', 'pato')).toBe(1);
    expect(editDistance('gato', 'gatos')).toBe(1);
    expect(editDistance('gatos', 'gato')).toBe(1);
  });

  it('reports anything further as over the cap rather than the real number', () => {
    // The caller only ever asks "is this one edit away", so the exact distance
    // past the cap is work nobody uses.
    expect(editDistance('gato', 'perro')).toBeGreaterThan(1);
    expect(editDistance('casa', 'castillo')).toBeGreaterThan(1);
  });

  it('bails on a length gap without walking the matrix', () => {
    expect(editDistance('sol', 'serpiente')).toBe(2);
  });

  it('honours a wider cap when asked', () => {
    expect(editDistance('gato', 'pata', 2)).toBe(2);
  });
});
