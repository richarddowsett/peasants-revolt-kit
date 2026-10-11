import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSet, mockDoc, mockCollection } = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockDoc = vi.fn(() => ({
    set: mockSet,
    get: vi.fn(),
    delete: vi.fn(),
  }));
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    where: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    })),
  }));

  return { mockSet, mockDoc, mockCollection };
});

vi.mock('./FirebaseAdminConfig', () => ({
  adminDb: {
    collection: mockCollection,
  },
}));

import { FirestoreAdminOrderRepositoryAdapter } from './FirestoreAdminOrderRepositoryAdapter';

describe('FirestoreAdminOrderRepositoryAdapter', () => {
  let adapter: FirestoreAdminOrderRepositoryAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockReset();
    mockDoc.mockReturnValue({
      set: mockSet,
      get: vi.fn(),
      delete: vi.fn(),
    });
    adapter = new FirestoreAdminOrderRepositoryAdapter();
  });

  describe('createOrder', () => {
    const sampleOrderData = {
      userEmail: 'runner@example.com',
      userName: 'Jane Runner',
      items: [
        {
          productId: 'prod_1',
          productName: 'Jacket',
          price: 45,
          size: 'M',
          quantity: 1,
          subtotal: 45,
        },
      ],
      totalAmount: 45,
      status: 'pending_payment' as const,
      monzoReference: 'PRRC-0010',
    };

    it('successfully persists order to Firestore and returns it', async () => {
      mockSet.mockResolvedValueOnce(undefined);

      const result = await adapter.createOrder(
        sampleOrderData,
        'https://monzo.me/terenceanthonysumpter/45.00?d=PRRC-0010'
      );

      expect(mockCollection).toHaveBeenCalledWith('orders');
      expect(mockDoc).toHaveBeenCalledWith('PRRC-0010');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'PRRC-0010',
          userEmail: 'runner@example.com',
          totalAmount: 45,
        })
      );
      expect(result.id).toBe('PRRC-0010');
      expect(result.status).toBe('pending_payment');
    });

    it('explicitly throws an error when Firestore database write fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Firestore network timeout or permission denied'));

      await expect(
        adapter.createOrder(
          sampleOrderData,
          'https://monzo.me/terenceanthonysumpter/45.00?d=PRRC-0010'
        )
      ).rejects.toThrow('Failed to persist order to database: Firestore network timeout or permission denied');
    });
  });

  describe('updateOrderStatus', () => {
    it('explicitly throws an error when status update database write fails', async () => {
      const mockGet = vi.fn().mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'PRRC-0010',
          userEmail: 'runner@example.com',
          status: 'pending_payment',
          totalAmount: 45,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      mockDoc.mockReturnValue({
        set: mockSet,
        get: mockGet,
        delete: vi.fn(),
      });

      mockSet.mockRejectedValueOnce(new Error('Firestore update failure'));

      await expect(
        adapter.updateOrderStatus('PRRC-0010', 'payment_successful')
      ).rejects.toThrow('Failed to update order status in database: Firestore update failure');
    });
  });
});
