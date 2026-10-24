import { ClubEvent, EventTicket } from '../../entities/ClubEvent';

export interface ReserveTicketInput {
  event: ClubEvent;
  userName: string;
  userEmail: string;
  userId?: string;
  paymentLinkGenerator: (ticketId: string, price: number) => string;
  now?: Date;
}

export interface EventTicketRepositoryOutboundPort {
  createTicket(ticket: EventTicket): Promise<EventTicket>;
  getTicketById(id: string): Promise<EventTicket | null>;
  getTicketByUuid(ticketUuid: string): Promise<EventTicket | null>;
  listTicketsByEvent(eventId: string): Promise<EventTicket[]>;
  listTicketsByEmail(email: string): Promise<EventTicket[]>;
  listAllTickets(): Promise<EventTicket[]>;
  updateTicket(id: string, partial: Partial<EventTicket>): Promise<EventTicket>;
  reserveAndCreateTicket(input: ReserveTicketInput): Promise<EventTicket>;
  cancelTicketAndReleaseCapacity(ticketId: string, reason?: string): Promise<EventTicket>;
}
