import { ClubEvent, EventTicket } from '../../entities/ClubEvent';

export interface EmailOutboundPort {
  sendEventTicketEmail(
    ticket: EventTicket,
    event: ClubEvent
  ): Promise<{ sent: boolean; messageId?: string }>;
}
