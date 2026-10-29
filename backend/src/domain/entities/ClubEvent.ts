import { Order } from './Order';

export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  saleStartAt: string;
  saleEndAt?: string;
  maxTickets: number;
  ticketPrice: number;
  address: string;
  logoUrl: string;
  fromEmail: string;
  ticketsSold?: number;
  nextTicketSequence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClubEventWithStats {
  event: ClubEvent;
  isSaleOpen: boolean;
  isSaleClosed: boolean;
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
  cancelledAt?: string;
  cancellationReason?: string;
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

export const QA_EVENTS_FROM_EMAIL =
  'Peasants Running Club <eventsqa@peasants-running-kit.store>';

export function isQaEnvironment(): boolean {
  const env = (process.env.ENVIRONMENT || '').toLowerCase();
  const projectId = (process.env.PROJECT_ID || process.env.GCP_PROJECT || '').toLowerCase();
  return env === 'qa' || projectId.includes('-qa');
}

export function getDefaultEventsFromEmail(): string {
  if (process.env.EVENTS_EMAIL_FROM && process.env.EVENTS_EMAIL_FROM.trim()) {
    return process.env.EVENTS_EMAIL_FROM.trim();
  }
  if (isQaEnvironment()) {
    return QA_EVENTS_FROM_EMAIL;
  }
  return DEFAULT_EVENTS_FROM_EMAIL;
}

export function mapEventTicketToOrder(ticket: EventTicket): Order {
  return {
    id: ticket.id,
    userEmail: ticket.userEmail,
    userName: ticket.userName,
    userId: ticket.userId,
    items: [
      {
        productId: ticket.eventId,
        productName: `${ticket.eventTitle} — Event Ticket`,
        price: ticket.unitPrice,
        size: '1 Ticket',
        quantity: 1,
        subtotal: ticket.unitPrice,
      },
    ],
    totalAmount: ticket.unitPrice,
    status: ticket.status,
    paymentLinkUrl: ticket.paymentLinkUrl,
    monzoReference: ticket.monzoReference,
    orderType: 'event_ticket',
    eventId: ticket.eventId,
    eventTitle: ticket.eventTitle,
    eventStartDate: ticket.eventStartDate,
    eventAddress: ticket.eventAddress,
    ticketUuid: ticket.ticketUuid,
    ticketEmailSentAt: ticket.ticketEmailSentAt,
    checkedIn: ticket.checkedIn,
    checkedInAt: ticket.checkedInAt,
    cancellationReason: ticket.cancellationReason,
    cancelledAt: ticket.cancelledAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}
