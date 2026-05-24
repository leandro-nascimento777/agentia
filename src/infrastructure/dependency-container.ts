import { GenerateTravelItineraryUseCase } from '../domain/usecases/GenerateTravelItineraryUseCase';
import { OpenAITravelAdapter } from '../adapters/secondary/OpenAITravelAdapter';
import { PdfGeneratorAdapter } from '../adapters/secondary/PdfGeneratorAdapter';
import { WhatsAppAdapter } from '../adapters/primary/WhatsAppAdapter';
import { TravelApiAdapter } from '../adapters/primary/TravelApiAdapter';

type Container = {
  useCase: GenerateTravelItineraryUseCase;
  whatsapp: WhatsAppAdapter;
  travelApi: TravelApiAdapter;
};

declare global {
  // eslint-disable-next-line no-var
  var __travelBotContainer: Container | undefined;
}

function createContainer(): Container {
  const aiAdapter = new OpenAITravelAdapter();
  const pdfAdapter = new PdfGeneratorAdapter();
  const useCase = new GenerateTravelItineraryUseCase(aiAdapter, pdfAdapter);

  const travelApi = new TravelApiAdapter(useCase);

  return {
    useCase,
    whatsapp: new WhatsAppAdapter(travelApi),
    travelApi,
  };
}

export const container: Container =
  globalThis.__travelBotContainer ?? (globalThis.__travelBotContainer = createContainer());
