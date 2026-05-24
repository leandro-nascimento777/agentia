import { TravelRequest } from '../entities/TravelRequest';
import { ITravelAIServicePort } from '../ports/output/ITravelAIServicePort';
import { IPdfGeneratorPort } from '../ports/output/IPdfGeneratorPort';

export class GenerateTravelItineraryUseCase {
  constructor(
    private readonly aiService: ITravelAIServicePort,
    private readonly pdfService: IPdfGeneratorPort,
  ) {}

  async execute(request: TravelRequest): Promise<Buffer> {
    const itinerary = await this.aiService.generateItinerary(request);
    const pdfBuffer = await this.pdfService.generate(itinerary);
    return pdfBuffer;
  }
}
