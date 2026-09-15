import { parseMaxRooms } from './env';

describe('parseMaxRooms', () => {
  it('takes a positive integer', () => {
    expect(parseMaxRooms('120')).toBe(120);
  });

  it('falls back when the variable is unset or empty', () => {
    expect(parseMaxRooms(undefined)).toBe(500);
    expect(parseMaxRooms('')).toBe(500);
  });

  it('falls back on anything that is not a positive whole number', () => {
    // A typo must not silently cap the server at zero rooms.
    for (const raw of ['0', '-5', '12.5', 'many', 'Infinity']) {
      expect(parseMaxRooms(raw)).toBe(500);
    }
  });

  it('honours an explicit fallback', () => {
    expect(parseMaxRooms(undefined, 25)).toBe(25);
  });
});
