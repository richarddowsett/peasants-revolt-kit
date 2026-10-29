import crypto from 'crypto';
import {
  CreateEventInboundPort,
  CreateEventInput,
  DeleteEventInboundPort,
  GetEventByIdInboundPort,
  ListEventsInboundPort,
  PurchaseEventTicketInboundPort,
  PurchaseEventTicketInput,
  UpdateEventInboundPort,
  UpdateEventInput,
  UpdateEventTicketStatusInboundPort,
  VerifyAndCheckInEventTicketInboundPort,
} from '../ports/inbound/EventInboundPorts';
import { EventRepositoryOutboundPort } from '../ports/outbound/EventRepositoryOutboundPort';
import { EventTicketRepositoryOutboundPort } from '../ports/outbound/EventTicketRepositoryOutboundPort';
import { PaymentGatewayOutboundPort } from '../ports/outbound/PaymentGatewayOutboundPort';
import { EmailOutboundPort } from '../ports/outbound/EmailOutboundPort';
import {
  ClubEvent,
  ClubEventWithStats,
  EventTicket,
  EventTicketStatus,
  EventTicketVerificationResult,
  getDefaultEventsFromEmail,
} from '../entities/ClubEvent';

export function buildClubEventStats(
  event: ClubEvent,
  eventTickets: EventTicket[],
  now: Date = new Date()
): ClubEventWithStats {
  const activeTickets = eventTickets.filter((t) => t.status !== 'cancelled');
  const ticketsSold = activeTickets.length;
  const ticketsRemaining = Math.max(0, event.maxTickets - ticketsSold);
  const ticketsCheckedIn = activeTickets.filter((t) => Boolean(t.checkedIn)).length;

  const saleStartMs = Date.parse(event.saleStartAt);
  const startMs = Date.parse(event.startDate);
  const saleEndMs = event.saleEndAt ? Date.parse(event.saleEndAt) : startMs;

  const isSaleClosed = !Number.isNaN(saleEndMs) && now.getTime() > saleEndMs;
  const isSaleOpen =
    !Number.isNaN(saleStartMs) &&
    now.getTime() >= saleStartMs &&
    (Number.isNaN(saleEndMs) || now.getTime() <= saleEndMs);

  return {
    event,
    isSaleOpen,
    isSaleClosed,
    ticketsSold,
    ticketsRemaining,
    ticketsCheckedIn,
  };
}

export class ListEventsUseCase implements ListEventsInboundPort {
  constructor(
    private eventRepo: EventRepositoryOutboundPort,
    private ticketRepo: EventTicketRepositoryOutboundPort
  ) {}

  async execute(options?: { includePast?: boolean; now?: Date }): Promise<ClubEventWithStats[]> {
    const now = options?.now || new Date();
    const includePast = Boolean(options?.includePast);

    const [events, allTickets] = await Promise.all([
      this.eventRepo.listEvents(),
      this.ticketRepo.listAllTickets(),
    ]);

    const filtered = includePast
      ? events
      : events.filter((evt) => {
          const startMs = Date.parse(evt.startDate);
          return !Number.isNaN(startMs) && startMs >= now.getTime();
        });

    const sorted = [...filtered].sort(
      (a, b) => Date.parse(a.startDate) - Date.parse(b.startDate)
    );

    return sorted.map((evt) => {
      const ticketsForEvent = allTickets.filter((t) => t.eventId === evt.id);
      return buildClubEventStats(evt, ticketsForEvent, now);
    });
  }
}

export class GetEventByIdUseCase implements GetEventByIdInboundPort {
  constructor(
    private eventRepo: EventRepositoryOutboundPort,
    private ticketRepo: EventTicketRepositoryOutboundPort
  ) {}

  async execute(eventId: string, now: Date = new Date()): Promise<ClubEventWithStats | null> {
    const event = await this.eventRepo.getEventById(eventId);
    if (!event) return null;

    const tickets = await this.ticketRepo.listTicketsByEvent(eventId);
    return buildClubEventStats(event, tickets, now);
  }
}

export class CreateEventUseCase implements CreateEventInboundPort {
  constructor(private eventRepo: EventRepositoryOutboundPort) {}

  async execute(input: CreateEventInput): Promise<ClubEvent> {
    const title = (input.title || '').trim();
    if (!title) {
      throw new Error('Please provide an event title.');
    }

    const description = (input.description || '').trim();
    if (!description) {
      throw new Error('Please provide an event description.');
    }

    const startDate = (input.startDate || '').trim();
    if (!startDate || Number.isNaN(Date.parse(startDate))) {
      throw new Error('Please provide a valid event start date and time.');
    }

    const saleStartAt = (input.saleStartAt || '').trim();
    if (!saleStartAt || Number.isNaN(Date.parse(saleStartAt))) {
      throw new Error('Please provide a valid ticket sale start date and time.');
    }

    const saleEndAt = (input.saleEndAt || '').trim();
    if (saleEndAt) {
      if (Number.isNaN(Date.parse(saleEndAt))) {
        throw new Error('Please provide a valid ticket sale closing date and time.');
      }
      if (Date.parse(saleEndAt) < Date.parse(saleStartAt)) {
        throw new Error('Ticket sale closing date cannot be before sale opening date.');
      }
      if (Date.parse(saleEndAt) > Date.parse(startDate)) {
        throw new Error('Ticket sale closing date cannot be after the event start date.');
      }
    }

    const maxTickets = Number(input.maxTickets);
    if (!Number.isFinite(maxTickets) || maxTickets < 1) {
      throw new Error('Number of tickets must be at least 1.');
    }

    const ticketPrice = Number(input.ticketPrice);
    if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
      throw new Error('Ticket price must be greater than £0.');
    }

    const address = (input.address || '').trim();
    if (!address) {
      throw new Error('Please provide the event address.');
    }

    const nowIso = new Date().toISOString();
    const newEvent: ClubEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      description,
      startDate,
      saleStartAt,
      saleEndAt: saleEndAt || undefined,
      maxTickets: Math.floor(maxTickets),
      ticketPrice,
      address,
      logoUrl: (input.logoUrl || '').trim(),
      fromEmail: (input.fromEmail || '').trim() || getDefaultEventsFromEmail(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return this.eventRepo.createEvent(newEvent);
  }
}

export class UpdateEventUseCase implements UpdateEventInboundPort {
  constructor(private eventRepo: EventRepositoryOutboundPort) {}

  async execute(eventId: string, input: UpdateEventInput): Promise<ClubEvent> {
    const existing = await this.eventRepo.getEventById(eventId);
    if (!existing) {
      throw new Error(`Event ${eventId} not found.`);
    }

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    if (!title) {
      throw new Error('Please provide an event title.');
    }

    const description =
      input.description !== undefined ? input.description.trim() : existing.description;
    if (!description) {
      throw new Error('Please provide an event description.');
    }

    const startDate = input.startDate !== undefined ? input.startDate.trim() : existing.startDate;
    if (!startDate || Number.isNaN(Date.parse(startDate))) {
      throw new Error('Please provide a valid event start date and time.');
    }

    const saleStartAt =
      input.saleStartAt !== undefined ? input.saleStartAt.trim() : existing.saleStartAt;
    if (!saleStartAt || Number.isNaN(Date.parse(saleStartAt))) {
      throw new Error('Please provide a valid ticket sale start date and time.');
    }

    let saleEndAt: string | undefined;
    if (input.saleEndAt !== undefined) {
      const trimmedEnd = input.saleEndAt.trim();
      if (trimmedEnd) {
        if (Number.isNaN(Date.parse(trimmedEnd))) {
          throw new Error('Please provide a valid ticket sale closing date and time.');
        }
        if (Date.parse(trimmedEnd) < Date.parse(saleStartAt)) {
          throw new Error('Ticket sale closing date cannot be before sale opening date.');
        }
        if (Date.parse(trimmedEnd) > Date.parse(startDate)) {
          throw new Error('Ticket sale closing date cannot be after the event start date.');
        }
        saleEndAt = trimmedEnd;
      } else {
        saleEndAt = undefined;
      }
    } else {
      saleEndAt = existing.saleEndAt;
    }

    const maxTickets =
      input.maxTickets !== undefined ? Number(input.maxTickets) : existing.maxTickets;
    if (!Number.isFinite(maxTickets) || maxTickets < 1) {
      throw new Error('Number of tickets must be at least 1.');
    }

    const ticketPrice =
      input.ticketPrice !== undefined ? Number(input.ticketPrice) : existing.ticketPrice;
    if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
      throw new Error('Ticket price must be greater than £0.');
    }

    const address = input.address !== undefined ? input.address.trim() : existing.address;
    if (!address) {
      throw new Error('Please provide the event address.');
    }

    const logoUrl = input.logoUrl !== undefined ? input.logoUrl.trim() : existing.logoUrl;
    const fromEmail =
      input.fromEmail !== undefined && input.fromEmail.trim()
        ? input.fromEmail.trim()
        : existing.fromEmail || getDefaultEventsFromEmail();

    return this.eventRepo.updateEvent(eventId, {
      title,
      description,
      startDate,
      saleStartAt,
      saleEndAt,
      maxTickets: Math.floor(maxTickets),
      ticketPrice,
      address,
      logoUrl,
      fromEmail,
      updatedAt: new Date().toISOString(),
    });
  }
}

export class DeleteEventUseCase implements DeleteEventInboundPort {
  constructor(private eventRepo: EventRepositoryOutboundPort) {}

  async execute(eventId: string): Promise<void> {
    await this.eventRepo.deleteEvent(eventId);
  }
}

export class PurchaseEventTicketUseCase implements PurchaseEventTicketInboundPort {
  constructor(
    private eventRepo: EventRepositoryOutboundPort,
    private ticketRepo: EventTicketRepositoryOutboundPort,
    private paymentGateway: PaymentGatewayOutboundPort
  ) {}

  async execute(input: PurchaseEventTicketInput, now: Date = new Date()): Promise<EventTicket> {
    const trimmedName = (input.userName || '').trim();
    const trimmedEmail = (input.userEmail || '').trim().toLowerCase();

    if (!trimmedName) {
      throw new Error('Please enter your full name.');
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const event = await this.eventRepo.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found.');
    }

    const saleStartMs = Date.parse(event.saleStartAt);
    if (Number.isNaN(saleStartMs) || now.getTime() < saleStartMs) {
      throw new Error('Ticket sales for this event have not opened yet.');
    }

    const startMs = Date.parse(event.startDate);
    const saleEndMs = event.saleEndAt ? Date.parse(event.saleEndAt) : startMs;

    if (!Number.isNaN(saleEndMs) && now.getTime() > saleEndMs) {
      throw new Error('Ticket sales for this event have closed.');
    }

    if (!Number.isNaN(startMs) && now.getTime() > startMs) {
      throw new Error('This event has already started.');
    }

    return this.ticketRepo.reserveAndCreateTicket({
      event,
      userName: trimmedName,
      userEmail: trimmedEmail,
      userId: input.userId,
      paymentLinkGenerator: (ticketId, price) =>
        this.paymentGateway.generatePaymentLink(ticketId, price),
      now,
    });
  }
}

export const VALID_EVENT_TICKET_STATUSES: EventTicketStatus[] = [
  'pending_payment',
  'payment_successful',
  'completed',
  'cancelled',
];

export class UpdateEventTicketStatusUseCase implements UpdateEventTicketStatusInboundPort {
  constructor(
    private ticketRepo: EventTicketRepositoryOutboundPort,
    private eventRepo: EventRepositoryOutboundPort,
    private emailPort?: EmailOutboundPort
  ) {}

  async execute(
    ticketId: string,
    status: EventTicketStatus,
    reason?: string
  ): Promise<EventTicket> {
    if (!VALID_EVENT_TICKET_STATUSES.includes(status)) {
      throw new Error(`Invalid ticket status: ${status}`);
    }

    if (status === 'cancelled') {
      return this.ticketRepo.cancelTicketAndReleaseCapacity(ticketId, reason);
    }

    let updated = await this.ticketRepo.updateTicket(ticketId, {
      status,
      updatedAt: new Date().toISOString(),
    });

    if (status === 'payment_successful') {
      updated = await this.deliverTicketEmail(updated);
    }

    return updated;
  }

  async resendTicketEmail(ticketId: string): Promise<{ sent: boolean; messageId?: string }> {
    const ticket = await this.ticketRepo.getTicketById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found.`);
    }
    const updated = await this.deliverTicketEmail(ticket);
    return {
      sent: Boolean(updated.ticketEmailSentAt),
      messageId: updated.ticketEmailSentAt ? `resent_${ticket.id}` : undefined,
    };
  }

  private async deliverTicketEmail(ticket: EventTicket): Promise<EventTicket> {
    let currentTicket = ticket;
    if (!currentTicket.ticketUuid) {
      currentTicket = await this.ticketRepo.updateTicket(currentTicket.id, {
        ticketUuid: crypto.randomUUID(),
      });
    }

    if (!this.emailPort) {
      return currentTicket;
    }

    const eventFromDb = await this.eventRepo.getEventById(currentTicket.eventId);
    const event: ClubEvent = eventFromDb || {
      id: currentTicket.eventId,
      title: currentTicket.eventTitle,
      description: '',
      startDate: currentTicket.eventStartDate,
      saleStartAt: currentTicket.createdAt,
      maxTickets: 50,
      ticketPrice: currentTicket.unitPrice,
      address: currentTicket.eventAddress,
      logoUrl: currentTicket.eventLogoUrl || '',
      fromEmail: getDefaultEventsFromEmail(),
      createdAt: currentTicket.createdAt,
      updatedAt: currentTicket.updatedAt,
    };

    const result = await this.emailPort.sendEventTicketEmail(currentTicket, event);
    if (result.sent) {
      currentTicket = await this.ticketRepo.updateTicket(currentTicket.id, {
        ticketEmailSentAt: new Date().toISOString(),
      });
    }

    return currentTicket;
  }
}

export class VerifyAndCheckInEventTicketUseCase
  implements VerifyAndCheckInEventTicketInboundPort
{
  constructor(private ticketRepo: EventTicketRepositoryOutboundPort) {}

  async execute(
    ticketUuid: string,
    eventId?: string
  ): Promise<EventTicketVerificationResult> {
    const cleanUuid = (ticketUuid || '').trim();
    if (!cleanUuid) {
      return {
        valid: false,
        status: 'not_found',
        message: 'No QR ticket UUID provided.',
      };
    }

    const ticket = await this.ticketRepo.getTicketByUuid(cleanUuid);
    if (!ticket) {
      return {
        valid: false,
        status: 'not_found',
        message: `No event ticket found matching UUID: ${cleanUuid}`,
      };
    }

    if (eventId && ticket.eventId !== eventId) {
      return {
        valid: false,
        status: 'wrong_event',
        message: `Ticket ${ticket.id} belongs to a different event (${ticket.eventTitle}).`,
        ticket,
      };
    }

    if (ticket.status === 'cancelled') {
      return {
        valid: false,
        status: 'cancelled',
        message: `Ticket ${ticket.id} for ${ticket.userName} has been cancelled.`,
        ticket,
      };
    }

    if (ticket.status === 'pending_payment') {
      return {
        valid: false,
        status: 'unpaid',
        message: `Ticket ${ticket.id} for ${ticket.userName} has not been marked as paid yet.`,
        ticket,
      };
    }

    if (ticket.checkedIn) {
      return {
        valid: false,
        status: 'already_checked_in',
        message: `${ticket.userName} (${ticket.id}) has already been checked in${
          ticket.checkedInAt ? ` at ${new Date(ticket.checkedInAt).toLocaleTimeString()}` : ''
        }.`,
        ticket,
      };
    }

    const checkedInAt = new Date().toISOString();
    const updatedTicket = await this.ticketRepo.updateTicket(ticket.id, {
      checkedIn: true,
      checkedInAt,
      status: 'completed',
      updatedAt: checkedInAt,
    });

    return {
      valid: true,
      status: 'checked_in_now',
      message: `Entry confirmed! ${updatedTicket.userName} (${updatedTicket.id}) is now checked in.`,
      ticket: updatedTicket,
    };
  }
}
