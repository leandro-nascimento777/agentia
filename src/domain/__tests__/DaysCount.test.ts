import { DaysCount } from '../value-objects/DaysCount';

describe('DaysCount', () => {
  it('creates valid days count', () => {
    const days = DaysCount.create(5);
    expect(days.value).toBe(5);
  });

  it('accepts boundary value 1', () => {
    expect(DaysCount.create(1).value).toBe(1);
  });

  it('accepts boundary value 30', () => {
    expect(DaysCount.create(30).value).toBe(30);
  });

  it('rejects zero', () => {
    expect(() => DaysCount.create(0)).toThrow();
  });

  it('rejects value above 30', () => {
    expect(() => DaysCount.create(31)).toThrow();
  });

  it('rejects negative values', () => {
    expect(() => DaysCount.create(-1)).toThrow();
  });

  it('rejects non-integer values', () => {
    expect(() => DaysCount.create(2.5)).toThrow();
  });

  it('formats singular correctly', () => {
    expect(DaysCount.create(1).toString()).toBe('1 dia');
  });

  it('formats plural correctly', () => {
    expect(DaysCount.create(5).toString()).toBe('5 dias');
  });
});
