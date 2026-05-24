import { TravelRequest } from '../../domain/entities/TravelRequest';
import { ITravelControllerPort } from '../../domain/ports/input/ITravelControllerPort';
import { GenerateTravelItineraryUseCase } from '../../domain/usecases/GenerateTravelItineraryUseCase';

export class TravelApiAdapter implements ITravelControllerPort {
  constructor(private readonly useCase: GenerateTravelItineraryUseCase) {}

  async handleRequest(request: TravelRequest): Promise<Buffer> {
    return this.useCase.execute(request);
  }
}
