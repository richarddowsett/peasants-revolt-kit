import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  const originalEnv = { ...process.env };
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

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    delete process.env.EVENTS_EMAIL_FROM;
    delete process.env.ENVIRONMENT;
    delete process.env.PROJECT_ID;
    delete process.env.GCP_PROJECT;

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
      reserveAndCreateTicket: vi.fn(async (input) => {
        const now = input.now || new Date();
        const nowIso = now.toISOString();
        const eventYear =
          new Date(input.event.startDate).getFullYear() || now.getFullYear();

        const activeTickets = ticketsStore.filter(
          (t) => t.eventId === input.event.id && t.status !== 'cancelled'
        );
        if (activeTickets.length >= input.event.maxTickets) {
          throw new Error('Sorry, this event is sold out!');
        }

        const seq = (input.event.nextTicketSequence || activeTickets.length) + 1;
        input.event.nextTicketSequence = seq;
        input.event.ticketsSold = (input.event.ticketsSold || 0) + 1;

        const ticketId = `PRRC-EVT-${eventYear}-${String(seq).padStart(4, '0')}`;
        const paymentLinkUrl = input.paymentLinkGenerator(
          ticketId,
          Number(input.event.ticketPrice)
        );
        const ticket: EventTicket = {
          id: ticketId,
          eventId: input.event.id,
          eventTitle: input.event.title,
          eventStartDate: input.event.startDate,
          eventAddress: input.event.address,
          eventLogoUrl: input.event.logoUrl || undefined,
          userName: input.userName,
          userEmail: input.userEmail,
          userId: input.userId,
          unitPrice: input.event.ticketPrice,
          status: 'pending_payment',
          paymentLinkUrl,
          monzoReference: ticketId,
          ticketUuid: crypto.randomUUID(),
          checkedIn: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        ticketsStore.push(ticket);
        return ticket;
      }),
      cancelTicketAndReleaseCapacity: vi.fn(async (ticketId, reason) => {
        const idx = ticketsStore.findIndex((t) => t.id === ticketId);
        if (idx === -1) throw new Error('Ticket not found');
        const nowIso = new Date().toISOString();
        ticketsStore[idx] = {
          ...ticketsStore[idx],
          status: 'cancelled',
          cancelledAt: nowIso,
          cancellationReason: reason || 'Payment not received in good time',
          updatedAt: nowIso,
        };
        const evt = eventsStore.find((e) => e.id === ticketsStore[idx].eventId);
        if (evt && typeof evt.ticketsSold === 'number') {
          evt.ticketsSold = Math.max(0, evt.ticketsSold - 1);
        }
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

    it('prevents overselling when two users order simultaneously for the last remaining ticket', async () => {
      const purchaseUseCase = new PurchaseEventTicketUseCase(
        eventRepo,
        ticketRepo,
        paymentGateway
      );
      const saleOpenTime = new Date('2026-11-02T10:00:00.000Z');

      // Buy 1 ticket first. With maxTickets = 2, exactly 1 ticket is left.
      await purchaseUseCase.execute(
        {
          eventId: 'evt_xmas_2026',
          userName: 'Alice Runner',
          userEmail: 'alice@example.com',
        },
        saleOpenTime
      );

      // Now 2 users submit simultaneously for the 1 remaining spot
      const [orderA, orderB] = await Promise.allSettled([
        purchaseUseCase.execute(
          {
            eventId: 'evt_xmas_2026',
            userName: 'Bob Runner',
            userEmail: 'bob@example.com',
          },
          saleOpenTime
        ),
        purchaseUseCase.execute(
          {
            eventId: 'evt_xmas_2026',
            userName: 'Charlie Runner',
            userEmail: 'charlie@example.com',
          },
          saleOpenTime
        ),
      ]);

      const fulfilled = [orderA, orderB].filter((r) => r.status === 'fulfilled');
      const rejected = [orderA, orderB].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      if (rejected[0].status === 'rejected') {
        expect(rejected[0].reason.message).toBe('Sorry, this event is sold out!');
      }

      // Total tickets created should strictly not exceed maxTickets (2)
      expect(ticketsStore).toHaveLength(2);
    });

    it('allows an admin to cancel an unpaid ticket order and releases the capacity for subsequent purchases', async () => {
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
      const saleOpenTime = new Date('2026-11-02T10:00:00.000Z');

      // Fill both spots (maxTickets = 2)
      const ticket1 = await purchaseUseCase.execute(
        {
          eventId: 'evt_xmas_2026',
          userName: 'User 1',
          userEmail: 'user1@example.com',
        },
        saleOpenTime
      );
      await purchaseUseCase.execute(
        {
          eventId: 'evt_xmas_2026',
          userName: 'User 2',
          userEmail: 'user2@example.com',
        },
        saleOpenTime
      );

      // 3rd purchase fails as sold out
      await expect(
        purchaseUseCase.execute(
          {
            eventId: 'evt_xmas_2026',
            userName: 'User 3',
            userEmail: 'user3@example.com',
          },
          saleOpenTime
        )
      ).rejects.toThrow('Sorry, this event is sold out!');

      // Admin cancels User 1's unpaid ticket because payment was not received in good time
      const cancelledTicket = await statusUseCase.execute(
        ticket1.id,
        'cancelled',
        'Payment not received in good time'
      );
      expect(cancelledTicket.status).toBe('cancelled');
      expect(cancelledTicket.cancellationReason).toBe(
        'Payment not received in good time'
      );

      // Now User 3 attempts to buy again -> succeeds!
      const ticket3 = await purchaseUseCase.execute(
        {
          eventId: 'evt_xmas_2026',
          userName: 'User 3',
          userEmail: 'user3@example.com',
        },
        saleOpenTime
      );
      expect(ticket3.id).toBe('PRRC-EVT-2026-0003');
      expect(ticket3.userName).toBe('User 3');
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
