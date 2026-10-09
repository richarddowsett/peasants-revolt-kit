import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchProducts,
  saveProduct,
  deleteProduct,
  createOrder,
  fetchOrders,
  updateOrderStatus,
  verifyAdminPassword,
  uploadImages,
} from './api';

global.fetch = vi.fn();

describe('Frontend API Client (lib/api)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchProducts calls /api/products', async () => {
    const mockProducts = [{ id: '1', name: 'Running Top', price: 25 }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    });

    const products = await fetchProducts(false);
    expect(global.fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({ cache: 'no-store' }));
    expect(products).toEqual(mockProducts);
  });

  it('fetchProducts with all=true calls /api/products?all=true', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await fetchProducts(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/products?all=true', expect.objectContaining({ cache: 'no-store' }));
  });


  it('saveProduct posts data to /api/products', async () => {
    const productPayload = { name: 'Vest', price: 20 };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'prod_123', ...productPayload }),
    });

    const result = await saveProduct(productPayload);
    expect(global.fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(result.id).toBe('prod_123');
  });

  it('deleteProduct sends DELETE to /api/products/:id', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await deleteProduct('prod_123');
    expect(global.fetch).toHaveBeenCalledWith('/api/products/prod_123', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('createOrder posts order data to /api/orders', async () => {
    const orderPayload = { userName: 'Runner', userEmail: 'runner@example.com' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'PRRC-1234', ...orderPayload }),
    });

    const result = await createOrder(orderPayload);
    expect(global.fetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.id).toBe('PRRC-1234');
  });

  it('verifyAdminPassword sends password to /api/admin/login', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const isValid = await verifyAdminPassword('peasants2026!');
    expect(isValid).toBe(true);
  });
});
