import { TravelRequest } from '../entities/TravelRequest';

describe('TravelRequest', () => {
  it('creates valid request', () => {
    const req = TravelRequest.create('5 dias em Paris', '+5511999999999');
    expect(req.text).toBe('5 dias em Paris');
    expect(req.from).toBe('+5511999999999');
  });

  it('trims whitespace from text', () => {
    const req = TravelRequest.create('  5 dias em Paris  ', '+5511999999999');
    expect(req.text).toBe('5 dias em Paris');
  });

  it('rejects empty text', () => {
    expect(() => TravelRequest.create('', '+5511999999999')).toThrow();
  });

  it('rejects text shorter than 3 characters', () => {
    expect(() => TravelRequest.create('ab', '+5511999999999')).toThrow();
  });

  it('rejects text over 500 characters', () => {
    expect(() => TravelRequest.create('a'.repeat(501), '+5511999999999')).toThrow();
  });

  it('rejects empty from', () => {
    expect(() => TravelRequest.create('5 dias em Paris', '')).toThrow();
  });

  it('preserves the from field as-is', () => {
    const req = TravelRequest.create('3 dias no Rio', 'api-user');
    expect(req.from).toBe('api-user');
  });
});

describe('TravelRequest.isTravelMessage', () => {
  it('detects number + dias pattern', () => {
    expect(TravelRequest.isTravelMessage('5 dias em Paris')).toBe(true);
  });

  it('detects keyword roteiro', () => {
    expect(TravelRequest.isTravelMessage('quero um roteiro para Roma')).toBe(true);
  });

  it('detects keyword turismo', () => {
    expect(TravelRequest.isTravelMessage('turismo em Lisboa')).toBe(true);
  });

  it('rejects generic message with "dia" only', () => {
    expect(TravelRequest.isTravelMessage('bom dia!')).toBe(false);
  });

  it('rejects status broadcast content', () => {
    expect(TravelRequest.isTravelMessage('Reunião no sábado, dia 25/04')).toBe(false);
  });

  it('accepts "4 dia" singular', () => {
    expect(TravelRequest.isTravelMessage('4 dia em NY')).toBe(true);
  });
});
