import { judgeGuess, revealsAnswer } from './guess-match';

describe('judgeGuess', () => {
  it('accepts the word however it is spelled or cased', () => {
    expect(judgeGuess('ARAÑA', 'araña')).toBe('correct');
    expect(judgeGuess('  arana ', 'araña')).toBe('correct');
    expect(judgeGuess('¡león!', 'león')).toBe('correct');
  });

  it('calls a single slip on a long word close', () => {
    expect(judgeGuess('elefente', 'elefante')).toBe('close');
    expect(judgeGuess('castilo', 'castillo')).toBe('close');
  });

  it('does NOT call a short near-word close', () => {
    // `pato` is its own answer in this bank. Saying "close" would hand over
    // the one letter that separates them.
    expect(judgeGuess('pato', 'gato')).toBe('wrong');
    expect(judgeGuess('casa', 'cama')).toBe('wrong');
    expect(judgeGuess('sun', 'run')).toBe('wrong');
  });

  it('forgives a plural at any length, where a bare edit would not', () => {
    // The near miss players actually hit. `gato` is four letters, so the edit
    // budget is zero — but nobody typing `gatos` is guessing a different animal.
    expect(judgeGuess('gatos', 'gato')).toBe('close');
    expect(judgeGuess('gato', 'gatos')).toBe('close');
    expect(judgeGuess('flores', 'flor')).toBe('close');
    expect(judgeGuess('boxes', 'box')).toBe('close');
  });

  it('does not let the plural rule chew a short word down to nothing', () => {
    // Stripping `es` off `mes` leaves `m`, which would start matching anything.
    expect(judgeGuess('me', 'mes')).toBe('wrong');
  });

  it('allows two slips once the word is long enough to absorb them', () => {
    // Among bank answers of nine letters or more, only one English and ten
    // Spanish pairs sit within two edits: at this length a slip is a slip.
    expect(judgeGuess('refrigerator', 'refrigerador')).toBe('close');
    expect(judgeGuess('bicicletta', 'bicicleta')).toBe('close');
  });

  it('is wrong for anything further away', () => {
    expect(judgeGuess('perro', 'elefante')).toBe('wrong');
    expect(judgeGuess('helicoptero', 'refrigerador')).toBe('wrong');
  });

  it('treats an empty or punctuation-only guess as wrong, never as close', () => {
    expect(judgeGuess('', 'castillo')).toBe('wrong');
    expect(judgeGuess('???', 'castillo')).toBe('wrong');
  });
});

describe('revealsAnswer', () => {
  it('catches the word on its own and inside a sentence', () => {
    expect(revealsAnswer('castillo', 'castillo')).toBe(true);
    expect(revealsAnswer('es un castillo digo yo', 'castillo')).toBe(true);
    expect(revealsAnswer('CASTILLO!!', 'castillo')).toBe(true);
  });

  it('leaves a message that only looks like it alone', () => {
    expect(revealsAnswer('castillos', 'castillo')).toBe(false);
    expect(revealsAnswer('vaya dibujo', 'castillo')).toBe(false);
  });
});
