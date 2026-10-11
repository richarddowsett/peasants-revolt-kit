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
  getSignedUploadUrl,
  uploadImageViaSignedUrl,
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

  it('getSignedUploadUrl posts fileName and contentType to /api/upload/signed-url', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        uploadUrl: 'https://storage.googleapis.com/upload-signed',
        publicUrl: 'https://storage.googleapis.com/bucket/product-images/pic.png',
        filePath: 'product-images/pic.png',
      }),
    });

    const result = await getSignedUploadUrl('pic.png', 'image/png');
    expect(global.fetch).toHaveBeenCalledWith('/api/upload/signed-url', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'pic.png', contentType: 'image/png' }),
    }));
    expect(result.publicUrl).toBe('https://storage.googleapis.com/bucket/product-images/pic.png');
  });

  it('uploadImageViaSignedUrl fetches signed url and executes PUT directly to storage', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadUrl: 'https://storage.googleapis.com/upload-signed',
          publicUrl: 'https://storage.googleapis.com/bucket/product-images/pic.png',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    const mockFile = new File(['file contents'], 'pic.png', { type: 'image/png' });
    const url = await uploadImageViaSignedUrl(mockFile);

    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/upload/signed-url', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://storage.googleapis.com/upload-signed', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: mockFile,
    }));
    expect(url).toBe('https://storage.googleapis.com/bucket/product-images/pic.png');
  });

  it('uploadImages uploads all files via signed URLs', async () => {
    (global.fetch as any).mockImplementation(async (url: string, options?: any) => {
      if (url === '/api/upload/signed-url') {
        const body = JSON.parse(options?.body || '{}');
        return {
          ok: true,
          json: async () => ({
            uploadUrl: `https://storage.googleapis.com/signed/${body.fileName}`,
            publicUrl: `https://storage.googleapis.com/bucket/product-images/${body.fileName}`,
          }),
        };
      }
      if (typeof url === 'string' && url.startsWith('https://storage.googleapis.com/signed/')) {
        return { ok: true };
      }
      return { ok: false, status: 404 };
    });

    const file1 = new File(['a'], '1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['b'], '2.jpg', { type: 'image/jpeg' });

    const urls = await uploadImages([file1, file2]);
    expect(urls).toEqual([
      'https://storage.googleapis.com/bucket/product-images/1.jpg',
      'https://storage.googleapis.com/bucket/product-images/2.jpg',
    ]);
  });

  it('uploadImages falls back to /api/upload multipart if signed URL upload fails', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error on signed url'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://storage.googleapis.com/bucket/product-images/fallback.jpg',
          imageUrls: ['https://storage.googleapis.com/bucket/product-images/fallback.jpg'],
        }),
      });

    const file = new File(['a'], 'fallback.jpg', { type: 'image/jpeg' });
    const urls = await uploadImages([file]);

    expect(global.fetch).toHaveBeenLastCalledWith('/api/upload', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
    }));
    expect(urls).toEqual(['https://storage.googleapis.com/bucket/product-images/fallback.jpg']);
  });
});
