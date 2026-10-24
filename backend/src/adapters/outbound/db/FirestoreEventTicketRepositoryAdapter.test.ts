import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSet, mockGet, mockDoc, mockCollection, mockRunTransaction } = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockGet = vi.fn();
  const mockDoc = vi.fn(() => ({
    set: mockSet,
    get: mockGet,
  }));
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    get: mockGet,
    where: vi.fn().mockReturnThis(),
  }));
  const mockRunTransaction = vi.fn();

  return { mockSet, mockGet, mockDoc, mockCollection, mockRunTransaction };
});

vi.mock('./FirebaseAdminConfig', () => ({
  adminDb: {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  },
}));

import { FirestoreEventTicketRepositoryAdapter } from './FirestoreEventTicketRepositoryAdapter';
import { EventTicket } from '../../../domain/entities/ClubEvent';

describe('FirestoreEventTicketRepositoryAdapter', () => {
  let adapter: FirestoreEventTicketRepositoryAdapter;

  const sampleTicket: EventTicket = {
    id: 'PRRC-EVT-2026-0001',
    eventId: 'evt_1',
    eventTitle: 'Christmas Party',
    eventStartDate: '2026-12-19T19:30:00.000Z',
    eventAddress: 'Brentwood',
    ticketUuid: 'uuid-1234-5678',
    userName: 'Jane Runner',
    userEmail: 'jane@example.com',
    unitPrice: 25,
    status: 'payment_successful',
    monzoReference: 'PRRC-EVT-0001',
    paymentLinkUrl: 'https://monzo.me',
    checkedIn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FirestoreEventTicketRepositoryAdapter();
  });

  describe('createTicket', () => {
    it('persists ticket to firestore and local memory', async () => {
      mockSet.mockResolvedValueOnce(undefined);

      const created = await adapter.createTicket(sampleTicket);
      expect(mockDoc).toHaveBeenCalledWith('PRRC-EVT-2026-0001');
      expect(mockSet).toHaveBeenCalledWith(sampleTicket);
      expect(created.id).toBe('PRRC-EVT-2026-0001');
    });

    it('throws error when firestore set fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Write permission denied'));

      await expect(adapter.createTicket(sampleTicket)).rejects.toThrow('Failed to create event ticket in Firestore');
    });
  });

  describe('getTicketById', () => {
    it('returns ticket when found in firestore', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => sampleTicket,
      });

      const ticket = await adapter.getTicketById('PRRC-EVT-2026-0001');
      expect(ticket?.id).toBe('PRRC-EVT-2026-0001');
    });

    it('returns null when ticket does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const ticket = await adapter.getTicketById('missing');
      expect(ticket).toBeNull();
    });

    it('falls back to local memory store when firestore throws', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const ticket = await adapter.getTicketById('PRRC-EVT-2026-0001');
      expect(ticket?.id).toBe('PRRC-EVT-2026-0001');
    });
  });

  describe('getTicketByUuid', () => {
    it('returns ticket by uuid from firestore query', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => sampleTicket }],
      });

      const ticket = await adapter.getTicketByUuid('uuid-1234-5678');
      expect(ticket?.ticketUuid).toBe('uuid-1234-5678');
    });

    it('returns null when query returns empty', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const ticket = await adapter.getTicketByUuid('unknown-uuid');
      expect(ticket).toBeNull();
    });

    it('falls back to local memory store on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Query error'));

      const ticket = await adapter.getTicketByUuid('uuid-1234-5678');
      expect(ticket?.ticketUuid).toBe('uuid-1234-5678');
    });
  });

  describe('listTicketsByEvent', () => {
    it('returns tickets for the event', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [{ data: () => sampleTicket }],
      });

      const tickets = await adapter.listTicketsByEvent('evt_1');
      expect(tickets).toHaveLength(1);
    });

    it('falls back to local memory store on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Fetch error'));

      const tickets = await adapter.listTicketsByEvent('evt_1');
      expect(Array.isArray(tickets)).toBe(true);
    });
  });

  describe('updateTicket', () => {
    it('updates ticket in firestore and local memory', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => sampleTicket,
      });
      mockSet.mockResolvedValueOnce(undefined);

      const updated = await adapter.updateTicket('PRRC-EVT-2026-0001', {
        checkedIn: true,
      });

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ checkedIn: true }), { merge: true });
      expect(updated.checkedIn).toBe(true);
    });
  });

  describe('reserveAndCreateTicket', () => {
    const sampleEvent = {
      id: 'evt_xmas',
      title: 'Xmas Party',
      description: 'Party',
      startDate: '2026-12-19T19:30:00.000Z',
      saleStartAt: '2026-11-01T09:00:00.000Z',
      maxTickets: 50,
      ticketPrice: 25,
      address: 'Brentwood',
      logoUrl: '',
      fromEmail: 'events@test.com',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      ticketsSold: 0,
      nextTicketSequence: 1,
    };

    it('reserves and creates ticket inside a transaction when capacity is available', async () => {
      const mockTx = {
        get: vi
          .fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => sampleEvent,
          })
          .mockResolvedValueOnce({
            exists: false,
          }),
        create: vi.fn(),
        set: vi.fn(),
      };
      mockRunTransaction.mockImplementationOnce(async (cb) => cb(mockTx));

      const ticket = await adapter.reserveAndCreateTicket({
        event: sampleEvent,
        userName: 'John Runner',
        userEmail: 'john@example.com',
        paymentLinkGenerator: (ref, price) => `https://monzo.me/${price}?d=${ref}`,
      });

      expect(ticket.id).toBe('PRRC-EVT-2026-0001');
      expect(mockTx.create).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ticketsSold: 1, nextTicketSequence: 2 }),
        { merge: true }
      );
    });

    it('throws sold out error when ticketsSold reaches maxTickets', async () => {
      const soldOutEvent = { ...sampleEvent, ticketsSold: 50, maxTickets: 50 };
      const mockTx = {
        get: vi.fn().mockResolvedValueOnce({
          exists: true,
          data: () => soldOutEvent,
        }),
        create: vi.fn(),
        set: vi.fn(),
      };
      mockRunTransaction.mockImplementationOnce(async (cb) => cb(mockTx));

      await expect(
        adapter.reserveAndCreateTicket({
          event: soldOutEvent,
          userName: 'John Runner',
          userEmail: 'john@example.com',
          paymentLinkGenerator: () => 'link',
        })
      ).rejects.toThrow('Sorry, this event is sold out!');
    });

    it('falls back to local memory store when transaction throws network error', async () => {
      mockRunTransaction.mockRejectedValueOnce(new Error('Network error'));

      const fallbackTicket = await adapter.reserveAndCreateTicket({
        event: { ...sampleEvent, id: 'evt_fallback', maxTickets: 10 },
        userName: 'Fallback User',
        userEmail: 'fallback@example.com',
        paymentLinkGenerator: (ref) => `https://monzo.me/${ref}`,
      });

      expect(fallbackTicket.userName).toBe('Fallback User');
    });
  });

  describe('cancelTicketAndReleaseCapacity', () => {
    it('cancels ticket and decrements event ticketsSold in transaction', async () => {
      const pendingTicket = {
        ...sampleTicket,
        id: 'PRRC-EVT-2026-0099',
        status: 'pending_payment',
        eventId: 'evt_1',
      };
      const mockTx = {
        get: vi
          .fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => pendingTicket,
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ id: 'evt_1', ticketsSold: 5 }),
          }),
        set: vi.fn(),
      };
      mockRunTransaction.mockImplementationOnce(async (cb) => cb(mockTx));

      const cancelled = await adapter.cancelTicketAndReleaseCapacity(
        'PRRC-EVT-2026-0099',
        'Payment not received in good time'
      );

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationReason).toBe(
        'Payment not received in good time'
      );
      expect(mockTx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ticketsSold: 4 }),
        { merge: true }
      );
    });

    it('falls back to memory store if firestore transaction fails', async () => {
      mockRunTransaction.mockRejectedValueOnce(new Error('Firestore error'));

      const cancelled = await adapter.cancelTicketAndReleaseCapacity(
        'PRRC-EVT-2026-0001',
        'Payment not received in good time'
      );

      expect(cancelled.status).toBe('cancelled');
    });
  });
});
