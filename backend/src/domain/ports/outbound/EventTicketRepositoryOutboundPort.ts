import { EventTicket } from '../../entities/ClubEvent';

export interface EventTicketRepositoryOutboundPort {
  createTicket(ticket: EventTicket): Promise<EventTicket>;
  getTicketById(id: string): Promise<EventTicket | null>;
  getTicketByUuid(ticketUuid: string): Promise<EventTicket | null>;
  listTicketsByEvent(eventId: string): Promise<EventTicket[]>;
  listTicketsByEmail(email: string): Promise<EventTicket[]>;
  listAllTickets(): Promise<EventTicket[]>;
  updateTicket(id: string, partial: Partial<EventTicket>): Promise<EventTicket>;
}
