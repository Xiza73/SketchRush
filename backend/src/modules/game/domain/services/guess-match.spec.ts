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
  });

  it('is wrong for anything further away', () => {
    expect(judgeGuess('perro', 'elefante')).toBe('wrong');
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
