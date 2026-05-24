import OpenAI from 'openai';
import { z } from 'zod';
import { TravelRequest } from '../../domain/entities/TravelRequest';
import { TravelItinerary, DayPlan } from '../../domain/entities/TravelItinerary';
import { DaysCount } from '../../domain/value-objects/DaysCount';
import { Destination } from '../../domain/value-objects/Destination';
import { ITravelAIServicePort } from '../../domain/ports/output/ITravelAIServicePort';
import { extractDays, extractDestination } from './utils/travelTextParser';

const SYSTEM_PROMPT = `Você é um especialista em viagens. Analise a mensagem e gere um roteiro detalhado.
Retorne APENAS JSON válido com esta estrutura exata:
{
  "destination": "nome da cidade/destino",
  "days": número_de_dias,
  "dayPlans": [
    {
      "day": 1,
      "activities": ["atividade 1", "atividade 2", "atividade 3"],
      "meals": ["Café da manhã: X", "Almoço: Y", "Jantar: Z"]
    }
  ],
  "hotel": "nome do hotel recomendado",
  "transport": ["opção de transporte 1", "opção de transporte 2"],
  "restaurants": ["restaurante 1", "restaurante 2", "restaurante 3"]
}`;

const ItineraryDataSchema = z.object({
  destination: z.string().min(1),
  days: z.number().int().min(1).max(30),
  dayPlans: z.array(z.object({
    day: z.number().int().min(1),
    activities: z.array(z.string()),
    meals: z.array(z.string()),
  })),
  hotel: z.string(),
  transport: z.array(z.string()),
  restaurants: z.array(z.string()),
});

type ItineraryData = z.infer<typeof ItineraryDataSchema>;

export class OpenAITravelAdapter implements ITravelAIServicePort {
  private client: OpenAI | null = null;

  private get model(): string {
    return process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  }

  private resolveClient(): OpenAI | null {
    if (this.client) return this.client;
    if (!process.env.OPENAI_API_KEY) return null;
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return this.client;
  }

  async generateItinerary(request: TravelRequest): Promise<TravelItinerary> {
    const client = this.resolveClient();
    if (!client) {
      console.log('[OpenAIAdapter] OPENAI_API_KEY não configurada — usando mock');
      return this.generateMockItinerary(request.text);
    }
    try {
      return await this.generateWithOpenAI(request, client);
    } catch (error) {
      if (this.isQuotaError(error)) {
        console.warn('[OpenAIAdapter] Cota OpenAI esgotada — usando mock');
        return this.generateMockItinerary(request.text);
      }
      throw error;
    }
  }

  private isQuotaError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status: number }).status === 429
    );
  }

  private async generateWithOpenAI(request: TravelRequest, client: OpenAI): Promise<TravelItinerary> {
    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: request.text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('OpenAI retornou resposta vazia');

    const parsed = ItineraryDataSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`Resposta da OpenAI fora do formato esperado: ${parsed.error.message}`);
    }

    return this.buildItinerary(parsed.data);
  }

  private buildItinerary(data: ItineraryData): TravelItinerary {
    const destination = Destination.create(data.destination);
    const daysCount = DaysCount.create(data.days);
    const dayPlans: DayPlan[] = data.dayPlans.map((p) => ({
      day: p.day,
      activities: p.activities,
      meals: p.meals,
    }));

    return new TravelItinerary(
      destination,
      daysCount,
      dayPlans,
      data.hotel,
      data.transport,
      data.restaurants,
    );
  }

  private generateMockItinerary(text: string): TravelItinerary {
    const days = extractDays(text);
    const destName = extractDestination(text);

    const destination = Destination.create(destName);
    const daysCount = DaysCount.create(days);

    const dayPlans: DayPlan[] = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      activities: [
        `Visitar os principais pontos turísticos de ${destName}`,
        `Tour pelo centro histórico e museus locais`,
        `Explorar mercados, parques e cultura local`,
      ],
      meals: [
        `Café da manhã: buffet no hotel`,
        `Almoço: restaurante típico no centro`,
        `Jantar: gastronomia local recomendada`,
      ],
    }));

    return new TravelItinerary(
      destination,
      daysCount,
      dayPlans,
      `Hotel Central ${destName}`,
      ['Metrô / Ônibus', 'Táxi / Uber', 'Caminhada a pé'],
      [
        `Restaurante Típico de ${destName}`,
        'Café do Centro Histórico',
        'Bistrô & Culinária Local',
      ],
    );
  }
}
