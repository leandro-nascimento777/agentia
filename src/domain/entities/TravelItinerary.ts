import { DaysCount } from '../value-objects/DaysCount';
import { Destination } from '../value-objects/Destination';

export interface DayPlan {
  day: number;
  activities: string[];
  meals: string[];
}

export class TravelItinerary {
  constructor(
    readonly destination: Destination,
    readonly daysCount: DaysCount,
    readonly dayPlans: DayPlan[],
    readonly hotel: string,
    readonly transport: string[],
    readonly restaurants: string[],
  ) {}
}
