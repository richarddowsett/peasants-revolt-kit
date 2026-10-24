import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSet, mockGet, mockDoc, mockCollection } = vi.hoisted(() => {
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

  return { mockSet, mockGet, mockDoc, mockCollection };
});

vi.mock('./FirebaseAdminConfig', () => ({
  adminDb: {
    collection: mockCollection,
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
});
