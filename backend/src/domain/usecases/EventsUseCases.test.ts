import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateEventUseCase,
  DeleteEventUseCase,
  GetEventByIdUseCase,
  ListEventsUseCase,
  PurchaseEventTicketUseCase,
  UpdateEventTicketStatusUseCase,
  UpdateEventUseCase,
  VerifyAndCheckInEventTicketUseCase,
} from './EventsUseCases';
import { EventRepositoryOutboundPort } from '../ports/outbound/EventRepositoryOutboundPort';
import { EventTicketRepositoryOutboundPort } from '../ports/outbound/EventTicketRepositoryOutboundPort';
import { PaymentGatewayOutboundPort } from '../ports/outbound/PaymentGatewayOutboundPort';
import { EmailOutboundPort } from '../ports/outbound/EmailOutboundPort';
import { ClubEvent, EventTicket } from '../entities/ClubEvent';

describe('Club Events & Ticketing Use Cases', () => {
  let eventsStore: ClubEvent[];
  let ticketsStore: EventTicket[];
  let eventRepo: EventRepositoryOutboundPort;
  let ticketRepo: EventTicketRepositoryOutboundPort;
  let paymentGateway: PaymentGatewayOutboundPort;
  let emailPort: EmailOutboundPort;

  const sampleEvent: ClubEvent = {
    id: 'evt_xmas_2026',
    title: 'PRRC Christmas Party 2026',
    description: 'Festive drinks, food, and awards night!',
    startDate: '2026-12-19T19:30:00.000Z',
    saleStartAt: '2026-11-01T09:00:00.000Z',
    maxTickets: 2,
    ticketPrice: 25,
    address: 'The Brentwood Tap, CM14',
    logoUrl: '',
    fromEmail: 'Peasants Running Club <events@peasants-running-kit.store>',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  beforeEach(() => {
    eventsStore = [{ ...sampleEvent }];
    ticketsStore = [];

    eventRepo = {
      listEvents: vi.fn(async () => [...eventsStore]),
      getEventById: vi.fn(async (id) => eventsStore.find((e) => e.id === id) || null),
      createEvent: vi.fn(async (event) => {
        eventsStore.push(event);
        return event;
      }),
      updateEvent: vi.fn(async (id, partial) => {
        const idx = eventsStore.findIndex((e) => e.id === id);
        if (idx === -1) throw new Error('Event not found');
        eventsStore[idx] = { ...eventsStore[idx], ...partial };
        return eventsStore[idx];
      }),
      deleteEvent: vi.fn(async (id) => {
        eventsStore = eventsStore.filter((e) => e.id !== id);
      }),
    };

    ticketRepo = {
      createTicket: vi.fn(async (ticket) => {
        ticketsStore.push(ticket);
        return ticket;
      }),
      getTicketById: vi.fn(async (id) => ticketsStore.find((t) => t.id === id) || null),
      getTicketByUuid: vi.fn(
        async (uuid) => ticketsStore.find((t) => t.ticketUuid === uuid) || null
      ),
      listTicketsByEvent: vi.fn(async (eventId) =>
        ticketsStore.filter((t) => t.eventId === eventId)
      ),
      listTicketsByEmail: vi.fn(async (email) =>
        ticketsStore.filter((t) => t.userEmail.toLowerCase() === email.toLowerCase())
      ),
      listAllTickets: vi.fn(async () => [...ticketsStore]),
      updateTicket: vi.fn(async (id, partial) => {
        const idx = ticketsStore.findIndex((t) => t.id === id);
        if (idx === -1) throw new Error('Ticket not found');
        ticketsStore[idx] = { ...ticketsStore[idx], ...partial };
        return ticketsStore[idx];
      }),
    };

    paymentGateway = {
      generatePaymentLink: vi.fn(
        (ref: string, amount: number) =>
          `https://monzo.me/rebeccannevarney/${amount.toFixed(2)}?d=${ref}`
      ),
      getGatewayName: vi.fn(() => 'Monzo'),
    };

    emailPort = {
      sendEventTicketEmail: vi.fn(async () => ({ sent: true, messageId: 'resend_evt_1' })),
    };
  });

  describe('CreateEventUseCase, UpdateEventUseCase, DeleteEventUseCase & ListEventsUseCase', () => {
    it('creates an event with optional custom logoUrl and lists only upcoming events on public queries', async () => {
      const createUseCase = new CreateEventUseCase(eventRepo);
      const pastEvent = await createUseCase.execute({
        title: 'Past Summer Social',
        description: 'Already happened',
        startDate: '2025-07-10T18:00:00.000Z',
        saleStartAt: '2025-06-01T09:00:00.000Z',
        maxTickets: 40,
        ticketPrice: 15,
        address: 'King Georges Playing Fields',
        logoUrl: 'https://storage.googleapis.com/peasants-running-kit/summer-logo.png',
      });

      expect(pastEvent.logoUrl).toBe(
        'https://storage.googleapis.com/peasants-running-kit/summer-logo.png'
      );
      expect(pastEvent.fromEmail).toContain('events@peasants-running-kit.store');

      const listUseCase = new ListEventsUseCase(eventRepo, ticketRepo);
      const now = new Date('2026-10-21T10:00:00.000Z');

      const upcomingOnly = await listUseCase.execute({ includePast: false, now });
      expect(upcomingOnly).toHaveLength(1);
      expect(upcomingOnly[0].event.id).toBe('evt_xmas_2026');
      expect(upcomingOnly[0].isSaleOpen).toBe(false);

      const allEvents = await listUseCase.execute({ includePast: true, now });
      expect(allEvents).toHaveLength(2);

      const updateUseCase = new UpdateEventUseCase(eventRepo);
      const updated = await updateUseCase.execute('evt_xmas_2026', {
        maxTickets: 75,
        ticketPrice: 30,
      });
      expect(updated.maxTickets).toBe(75);
      expect(updated.ticketPrice).toBe(30);

      const getByIdUseCase = new GetEventByIdUseCase(eventRepo, ticketRepo);
      const fetched = await getByIdUseCase.execute('evt_xmas_2026', now);
      expect(fetched?.ticketsRemaining).toBe(75);

      const deleteUseCase = new DeleteEventUseCase(eventRepo);
      await deleteUseCase.execute(pastEvent.id);
      const afterDelete = await listUseCase.execute({ includePast: true, now });
      expect(afterDelete).toHaveLength(1);
    });
  });

  describe('PurchaseEventTicketUseCase', () => {
    it('blocks purchases before saleStartAt and when sold out, and generates PRRC-EVT-yyyy-XXXX references', async () => {
      const purchaseUseCase = new PurchaseEventTicketUseCase(
        eventRepo,
        ticketRepo,
        paymentGateway
      );

      // Before saleStartAt
      await expect(
        purchaseUseCase.execute(
          {
            eventId: 'evt_xmas_2026',
            userName: 'Alice Runner',
            userEmail: 'alice@example.com',
          },
          new Date('2026-10-25T10:00:00.000Z')
        )
      ).rejects.toThrow('Ticket sales for this event have not opened yet.');

      const saleOpenTime = new Date('2026-11-02T10:00:00.000Z');
      const ticket1 = await purchaseUseCase.execute(
        {
          eventId: 'evt_xmas_2026',
          userName: 'Alice Runner',
          userEmail: 'alice@example.com',
        },
        saleOpenTime
      );
      expect(ticket1.id).toBe('PRRC-EVT-2026-0001');
      expect(ticket1.ticketUuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      const ticket2 = await purchaseUseCase.execute(
        {
          eventId: 'evt_xmas_2026',
          userName: 'Bob Sprinter',
          userEmail: 'bob@example.com',
        },
        saleOpenTime
      );
      expect(ticket2.id).toBe('PRRC-EVT-2026-0002');

      // 3rd ticket should be blocked by maxTickets = 2
      await expect(
        purchaseUseCase.execute(
          {
            eventId: 'evt_xmas_2026',
            userName: 'Charlie Jogger',
            userEmail: 'charlie@example.com',
          },
          saleOpenTime
        )
      ).rejects.toThrow('Sorry, this event is sold out!');
    });
  });

  describe('UpdateEventTicketStatusUseCase & VerifyAndCheckInEventTicketUseCase', () => {
    it('sends a branded QR ticket email when marked payment_successful and auto-checks in at the door', async () => {
      const purchaseUseCase = new PurchaseEventTicketUseCase(
        eventRepo,
        ticketRepo,
        paymentGateway
      );
      const statusUseCase = new UpdateEventTicketStatusUseCase(
        ticketRepo,
        eventRepo,
        emailPort
      );
      const verifyUseCase = new VerifyAndCheckInEventTicketUseCase(ticketRepo);

      const ticket = await purchaseUseCase.execute(
        {
          eventId: 'evt_xmas_2026',
          userName: 'Alice Runner',
          userEmail: 'alice@example.com',
        },
        new Date('2026-11-02T10:00:00.000Z')
      );

      // Scanning before payment should return unpaid
      const unpaidScan = await verifyUseCase.execute(ticket.ticketUuid, 'evt_xmas_2026');
      expect(unpaidScan.valid).toBe(false);
      expect(unpaidScan.status).toBe('unpaid');

      // Mark payment received -> triggers emailPort.sendEventTicketEmail
      const paidTicket = await statusUseCase.execute(ticket.id, 'payment_successful');
      expect(paidTicket.status).toBe('payment_successful');
      expect(paidTicket.ticketEmailSentAt).toBeDefined();
      expect(emailPort.sendEventTicketEmail).toHaveBeenCalledTimes(1);

      // Scanning for wrong event -> wrong_event
      const wrongEventScan = await verifyUseCase.execute(ticket.ticketUuid, 'evt_other_999');
      expect(wrongEventScan.valid).toBe(false);
      expect(wrongEventScan.status).toBe('wrong_event');

      // Scanning for right event -> checked_in_now
      const firstScan = await verifyUseCase.execute(ticket.ticketUuid, 'evt_xmas_2026');
      expect(firstScan.valid).toBe(true);
      expect(firstScan.status).toBe('checked_in_now');
      expect(firstScan.ticket?.checkedIn).toBe(true);
      expect(firstScan.ticket?.status).toBe('completed');

      // Second scan -> already_checked_in
      const secondScan = await verifyUseCase.execute(ticket.ticketUuid, 'evt_xmas_2026');
      expect(secondScan.valid).toBe(false);
      expect(secondScan.status).toBe('already_checked_in');
    });
  });
});
