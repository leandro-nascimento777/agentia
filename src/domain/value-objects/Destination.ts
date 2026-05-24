import { z } from 'zod';

const DestinationSchema = z.string().trim().min(2).max(100);

export class Destination {
  private constructor(readonly value: string) {}

  static create(value: string): Destination {
    const result = DestinationSchema.safeParse(value);
    if (!result.success) {
      throw new Error(`Destination inválido: deve ter entre 2 e 100 caracteres`);
    }
    return new Destination(value.trim());
  }

  toString(): string {
    return this.value;
  }
}
