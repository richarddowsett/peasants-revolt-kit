export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  saleStartAt: string;
  maxTickets: number;
  ticketPrice: number;
  address: string;
  logoUrl: string;
  fromEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubEventWithStats {
  event: ClubEvent;
  isSaleOpen: boolean;
  ticketsSold: number;
  ticketsRemaining: number;
  ticketsCheckedIn: number;
}

export type EventTicketStatus =
  | 'pending_payment'
  | 'payment_successful'
  | 'completed'
  | 'cancelled';

export interface EventTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartDate: string;
  eventAddress: string;
  eventLogoUrl?: string;
  userName: string;
  userEmail: string;
  userId?: string;
  unitPrice: number;
  status: EventTicketStatus;
  paymentLinkUrl: string;
  monzoReference: string;
  ticketUuid: string;
  ticketEmailSentAt?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventTicketVerificationResult {
  valid: boolean;
  status:
    | 'checked_in_now'
    | 'already_checked_in'
    | 'unpaid'
    | 'cancelled'
    | 'wrong_event'
    | 'not_found';
  message: string;
  ticket?: EventTicket;
}

export const DEFAULT_EVENTS_FROM_EMAIL =
  'Peasants Running Club <events@peasants-running-kit.store>';

export function isEventTicketOrderType(orderType?: string): boolean {
  return (
    orderType === 'event_ticket' ||
    (typeof orderType === 'string' && /^christmas_\d{4}_ticket$/.test(orderType))
  );
}
