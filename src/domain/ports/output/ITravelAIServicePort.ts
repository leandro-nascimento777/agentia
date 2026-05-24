import { TravelRequest } from '../../entities/TravelRequest';
import { TravelItinerary } from '../../entities/TravelItinerary';

export interface ITravelAIServicePort {
  generateItinerary(request: TravelRequest): Promise<TravelItinerary>;
}
