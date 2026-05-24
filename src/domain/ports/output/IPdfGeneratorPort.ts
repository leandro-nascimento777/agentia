import { TravelItinerary } from '../../entities/TravelItinerary';

export interface IPdfGeneratorPort {
  generate(itinerary: TravelItinerary): Promise<Buffer>;
}
