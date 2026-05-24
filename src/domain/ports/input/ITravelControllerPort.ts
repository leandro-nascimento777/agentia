import { TravelRequest } from '../../entities/TravelRequest';

export interface ITravelControllerPort {
  handleRequest(request: TravelRequest): Promise<Buffer>;
}
