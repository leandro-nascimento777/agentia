import OpenAI from 'openai';
import { TravelRequest } from '../../domain/entities/TravelRequest';
import { TravelItinerary, DayPlan } from '../../domain/entities/TravelItinerary';
import { DaysCount } from '../../domain/value-objects/DaysCount';
import { Destination } from '../../domain/value-objects/Destination';
import { ITravelAIServicePort } from '../../domain/ports/output/ITravelAIServicePort';

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

interface ItineraryData {
  destination: string;
  days: number;
  dayPlans: Array<{ day: number; activities: string[]; meals: string[] }>;
  hotel: string;
  transport: string[];
  restaurants: string[];
}

const DAYS_REGEX = /(\d+)\s*dias?/i;
const DESTINATION_PATTERNS = [
  /(?:em|para|no|na|ao?)\s+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+){0,3})/i,
  /([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,2})\s+(?:por\s+)?\d+\s*dias?/i,
];

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

    const data = JSON.parse(raw) as ItineraryData;
    return this.buildItinerary(data);
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
    const days = this.extractDays(text);
    const destName = this.extractDestination(text);

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

  private extractDays(text: string): number {
    const match = text.match(DAYS_REGEX);
    if (!match) return 3;
    return Math.min(Math.max(parseInt(match[1], 10), 1), 30);
  }

  private extractDestination(text: string): string {
    for (const pattern of DESTINATION_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return 'Destino Especial';
  }
}
