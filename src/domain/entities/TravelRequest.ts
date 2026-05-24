import { z } from 'zod';

const TravelRequestSchema = z.object({
  text: z.string().trim().min(3).max(500),
  from: z.string().min(1),
});

const TRAVEL_PATTERN = /\b\d+\s*dias?\b/i;
const TRAVEL_KEYWORDS = ['roteiro', 'itinerario', 'turismo'] as const;

export class TravelRequest {
  private constructor(
    readonly text: string,
    readonly from: string,
  ) {}

  static create(text: string, from: string): TravelRequest {
    const result = TravelRequestSchema.safeParse({ text, from });
    if (!result.success) {
      throw new Error(`TravelRequest inválido: ${result.error.message}`);
    }
    return new TravelRequest(text.trim(), from);
  }

  static isTravelMessage(text: string): boolean {
    const lower = text.toLowerCase();
    return TRAVEL_PATTERN.test(text) || TRAVEL_KEYWORDS.some((kw) => lower.includes(kw));
  }
}
