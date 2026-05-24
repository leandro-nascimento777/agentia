import { GenerateTravelItineraryUseCase } from '../usecases/GenerateTravelItineraryUseCase';
import { TravelRequest } from '../entities/TravelRequest';
import { TravelItinerary } from '../entities/TravelItinerary';
import { DaysCount } from '../value-objects/DaysCount';
import { Destination } from '../value-objects/Destination';
import { ITravelAIServicePort } from '../ports/output/ITravelAIServicePort';
import { IPdfGeneratorPort } from '../ports/output/IPdfGeneratorPort';

const MOCK_ITINERARY = new TravelItinerary(
  Destination.create('Paris'),
  DaysCount.create(5),
  [{ day: 1, activities: ['Torre Eiffel'], meals: ['Croissant'] }],
  'Hotel Paris Centre',
  ['Metro'],
  ['Brasserie du Louvre'],
);

const MOCK_PDF = Buffer.from('mock-pdf-content');

const mockAiService: ITravelAIServicePort = {
  generateItinerary: jest.fn().mockResolvedValue(MOCK_ITINERARY),
};

const mockPdfService: IPdfGeneratorPort = {
  generate: jest.fn().mockResolvedValue(MOCK_PDF),
};

describe('GenerateTravelItineraryUseCase', () => {
  let useCase: GenerateTravelItineraryUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    (mockAiService.generateItinerary as jest.Mock).mockResolvedValue(MOCK_ITINERARY);
    (mockPdfService.generate as jest.Mock).mockResolvedValue(MOCK_PDF);
    useCase = new GenerateTravelItineraryUseCase(mockAiService, mockPdfService);
  });

  it('returns the generated PDF buffer', async () => {
    const request = TravelRequest.create('5 dias em Paris', '+5511999999999');
    const result = await useCase.execute(request);
    expect(result).toBe(MOCK_PDF);
  });

  it('calls AI service with the travel request', async () => {
    const request = TravelRequest.create('5 dias em Paris', '+5511999999999');
    await useCase.execute(request);
    expect(mockAiService.generateItinerary).toHaveBeenCalledTimes(1);
    expect(mockAiService.generateItinerary).toHaveBeenCalledWith(request);
  });

  it('calls PDF service with the AI-generated itinerary', async () => {
    const request = TravelRequest.create('7 dias em Roma', '+5511777777777');
    await useCase.execute(request);
    expect(mockPdfService.generate).toHaveBeenCalledWith(MOCK_ITINERARY);
  });

  it('propagates errors from the AI service', async () => {
    (mockAiService.generateItinerary as jest.Mock).mockRejectedValue(new Error('AI error'));
    const request = TravelRequest.create('5 dias em Paris', '+5511999999999');
    await expect(useCase.execute(request)).rejects.toThrow('AI error');
  });

  it('propagates errors from the PDF service', async () => {
    (mockPdfService.generate as jest.Mock).mockRejectedValue(new Error('PDF error'));
    const request = TravelRequest.create('5 dias em Paris', '+5511999999999');
    await expect(useCase.execute(request)).rejects.toThrow('PDF error');
  });

  it('does not call PDF service when AI service fails', async () => {
    (mockAiService.generateItinerary as jest.Mock).mockRejectedValue(new Error('AI fail'));
    const request = TravelRequest.create('5 dias em Paris', '+5511999999999');
    await expect(useCase.execute(request)).rejects.toThrow();
    expect(mockPdfService.generate).not.toHaveBeenCalled();
  });
});
