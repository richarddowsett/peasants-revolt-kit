import {
  ClubEvent,
  ClubEventWithStats,
  EventTicket,
  EventTicketStatus,
  EventTicketVerificationResult,
} from '../../entities/ClubEvent';

export interface ListEventsInboundPort {
  execute(options?: { includePast?: boolean; now?: Date }): Promise<ClubEventWithStats[]>;
}

export interface GetEventByIdInboundPort {
  execute(eventId: string, now?: Date): Promise<ClubEventWithStats | null>;
}

export interface CreateEventInput {
  title: string;
  description: string;
  startDate: string;
  saleStartAt: string;
  maxTickets: number;
  ticketPrice: number;
  address: string;
  logoUrl?: string;
  fromEmail?: string;
}

export interface CreateEventInboundPort {
  execute(input: CreateEventInput): Promise<ClubEvent>;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startDate?: string;
  saleStartAt?: string;
  maxTickets?: number;
  ticketPrice?: number;
  address?: string;
  logoUrl?: string;
  fromEmail?: string;
}

export interface UpdateEventInboundPort {
  execute(eventId: string, input: UpdateEventInput): Promise<ClubEvent>;
}

export interface DeleteEventInboundPort {
  execute(eventId: string): Promise<void>;
}

export interface PurchaseEventTicketInput {
  eventId: string;
  userName: string;
  userEmail: string;
  userId?: string;
}

export interface PurchaseEventTicketInboundPort {
  execute(input: PurchaseEventTicketInput, now?: Date): Promise<EventTicket>;
}

export interface UpdateEventTicketStatusInboundPort {
  execute(ticketId: string, status: EventTicketStatus): Promise<EventTicket>;
  resendTicketEmail(ticketId: string): Promise<{ sent: boolean; messageId?: string }>;
}

export interface VerifyAndCheckInEventTicketInboundPort {
  execute(ticketUuid: string, eventId?: string): Promise<EventTicketVerificationResult>;
}
