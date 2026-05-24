import { z } from 'zod';

const DaysCountSchema = z.number().int().min(1).max(30);

export class DaysCount {
  private constructor(readonly value: number) {}

  static create(value: number): DaysCount {
    const result = DaysCountSchema.safeParse(value);
    if (!result.success) {
      throw new Error(`DaysCount inválido: deve ser um inteiro entre 1 e 30`);
    }
    return new DaysCount(value);
  }

  toString(): string {
    return `${this.value} dia${this.value > 1 ? 's' : ''}`;
  }
}
