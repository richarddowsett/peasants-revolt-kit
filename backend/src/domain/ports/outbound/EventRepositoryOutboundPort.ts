import { ClubEvent } from '../../entities/ClubEvent';

export interface EventRepositoryOutboundPort {
  listEvents(): Promise<ClubEvent[]>;
  getEventById(id: string): Promise<ClubEvent | null>;
  createEvent(event: ClubEvent): Promise<ClubEvent>;
  updateEvent(id: string, partial: Partial<ClubEvent>): Promise<ClubEvent>;
  deleteEvent(id: string): Promise<void>;
}
