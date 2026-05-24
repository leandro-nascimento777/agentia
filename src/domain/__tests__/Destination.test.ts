import { Destination } from '../value-objects/Destination';

describe('Destination', () => {
  it('creates valid destination', () => {
    const dest = Destination.create('Paris');
    expect(dest.value).toBe('Paris');
  });

  it('trims surrounding whitespace', () => {
    const dest = Destination.create('  Rio de Janeiro  ');
    expect(dest.value).toBe('Rio de Janeiro');
  });

  it('accepts multi-word destinations', () => {
    const dest = Destination.create('Nova York');
    expect(dest.value).toBe('Nova York');
  });

  it('rejects empty string', () => {
    expect(() => Destination.create('')).toThrow();
  });

  it('rejects single character', () => {
    expect(() => Destination.create('P')).toThrow();
  });

  it('rejects strings over 100 characters', () => {
    expect(() => Destination.create('A'.repeat(101))).toThrow();
  });

  it('toString returns value', () => {
    expect(Destination.create('Lisboa').toString()).toBe('Lisboa');
  });
});
