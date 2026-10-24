import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSet, mockGet, mockDelete, mockDoc, mockCollection } = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockGet = vi.fn();
  const mockDelete = vi.fn().mockResolvedValue(undefined);
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

import { FirestoreAdminProductRepositoryAdapter } from './FirestoreAdminProductRepositoryAdapter';
import { Product } from '../../../domain/entities/Product';

describe('FirestoreAdminProductRepositoryAdapter', () => {
  let adapter: FirestoreAdminProductRepositoryAdapter;

  const mockProduct: Product = {
    id: 'prod_123',
    name: 'Running Vest',
    description: 'Lightweight race vest',
    price: 30,
    sizes: ['S', 'M', 'L'],
    imageUrl: 'https://images/vest.png',
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FirestoreAdminProductRepositoryAdapter();
  });

  describe('getAllProducts', () => {
    it('returns empty array when collection is empty', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const products = await adapter.getAllProducts();
      expect(products).toEqual([]);
    });

    it('returns products from firestore docs and purges legacy seed ids', async () => {
      const docs = [
        {
          id: 'prod_123',
          data: () => ({ name: 'Running Vest', price: 30, isPublished: true }),
          ref: { delete: mockDelete },
        },
        {
          id: 'prod_hoodie_01',
          data: () => ({ name: 'Legacy Hoodie' }),
          ref: { delete: mockDelete },
        },
      ];

      mockGet.mockResolvedValueOnce({ empty: false, docs });

      const products = await adapter.getAllProducts();
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('prod_123');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('returns memory store fallback when firestore throws', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore network error'));

      const products = await adapter.getAllProducts();
      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe('getPublishedProducts', () => {
    it('filters for only published products', async () => {
      const docs = [
        {
          id: 'prod_1',
          data: () => ({ name: 'Published', isPublished: true }),
          ref: { delete: mockDelete },
        },
        {
          id: 'prod_2',
          data: () => ({ name: 'Draft', isPublished: false }),
          ref: { delete: mockDelete },
        },
      ];
      mockGet.mockResolvedValueOnce({ empty: false, docs });

      const published = await adapter.getPublishedProducts();
      expect(published).toHaveLength(1);
      expect(published[0].id).toBe('prod_1');
    });
  });

  describe('getProductById', () => {
    it('returns product when doc exists in firestore', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'prod_123',
        data: () => ({ name: 'Running Vest', price: 30 }),
      });

      const product = await adapter.getProductById('prod_123');
      expect(product).toEqual({
        id: 'prod_123',
        name: 'Running Vest',
        price: 30,
      });
    });

    it('returns null when doc does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const product = await adapter.getProductById('unknown');
      expect(product).toBeNull();
    });

    it('falls back to local memory store when firestore throws', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const product = await adapter.getProductById('unknown');
      expect(product).toBeNull();
    });
  });

  describe('saveProduct', () => {
    it('saves product to firestore doc set', async () => {
      mockSet.mockResolvedValueOnce(undefined);

      const saved = await adapter.saveProduct(mockProduct);
      expect(mockDoc).toHaveBeenCalledWith('prod_123');
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ name: 'Running Vest' }), { merge: true });
      expect(saved.id).toBe(mockProduct.id);
      expect(saved.name).toBe(mockProduct.name);
    });
  });

  describe('deleteProduct', () => {
    it('deletes product from firestore doc', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      await adapter.deleteProduct('prod_123');
      expect(mockDoc).toHaveBeenCalledWith('prod_123');
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
