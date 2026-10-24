import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSet, mockGet, mockDelete, mockDoc, mockCollection } = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockGet = vi.fn();
  const mockDelete = vi.fn();
  const mockDoc = vi.fn(() => ({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  }));
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    get: mockGet,
  }));

  return { mockSet, mockGet, mockDelete, mockDoc, mockCollection };
});

vi.mock('./FirebaseAdminConfig', () => ({
  adminDb: {
    collection: mockCollection,
  },
}));

import { FirestoreEventRepositoryAdapter } from './FirestoreEventRepositoryAdapter';
import { ClubEvent } from '../../../domain/entities/ClubEvent';

describe('FirestoreEventRepositoryAdapter', () => {
  let adapter: FirestoreEventRepositoryAdapter;

  const sampleEvent: ClubEvent = {
    id: 'evt_1',
    title: 'Christmas Party 2026',
    description: 'Annual Party',
    startDate: '2026-12-19T19:30:00.000Z',
    saleStartAt: '2026-11-01T09:00:00.000Z',
    maxTickets: 50,
    ticketPrice: 25,
    address: 'Brentwood',
    logoUrl: '',
    fromEmail: 'Peasants Running Club <events@peasants-running-kit.store>',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FirestoreEventRepositoryAdapter();
  });

  describe('listEvents', () => {
    it('returns normalized events from firestore docs', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [{ data: () => sampleEvent }],
      });

      const events = await adapter.listEvents();
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('evt_1');
    });

    it('returns local memory events on firestore error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const events = await adapter.listEvents();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('getEventById', () => {
    it('returns event when found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => sampleEvent,
      });

      const event = await adapter.getEventById('evt_1');
      expect(event?.id).toBe('evt_1');
    });

    it('returns null when event does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const event = await adapter.getEventById('missing');
      expect(event).toBeNull();
    });

    it('returns fallback on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('DB err'));

      const event = await adapter.getEventById('missing');
      expect(event).toBeNull();
    });
  });

  describe('createEvent', () => {
    it('saves event to firestore and local memory', async () => {
      mockSet.mockResolvedValueOnce(undefined);

      const saved = await adapter.createEvent(sampleEvent);
      expect(mockDoc).toHaveBeenCalledWith('evt_1');
      expect(mockSet).toHaveBeenCalledWith(sampleEvent);
      expect(saved.id).toBe('evt_1');
    });
  });

  describe('updateEvent', () => {
    it('updates event in firestore', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => sampleEvent,
      });
      mockSet.mockResolvedValueOnce(undefined);

      const updated = await adapter.updateEvent('evt_1', { title: 'Updated Title' });
      expect(updated.title).toBe('Updated Title');
    });
  });

  describe('deleteEvent', () => {
    it('deletes event from firestore', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      await adapter.deleteEvent('evt_1');
      expect(mockDoc).toHaveBeenCalledWith('evt_1');
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
