import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchProducts,
  saveProduct,
  deleteProduct,
  createOrder,
  fetchOrders,
  lookupOrder,
  updateOrderStatus,
  verifyAdminPassword,
  uploadImage,
  uploadImages,
  getSignedUploadUrl,
  uploadImageViaSignedUrl,
  fetchFeatureFlags,
  fetchFeatureFlag,
  updateFeatureFlag,
  fetchEvents,
  fetchEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  purchaseEventTicket,
  fetchEventTickets,
  updateEventTicketStatus,
  resendEventTicketEmail,
  verifyEventTicketQr,
} from './api';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('Frontend API Client (lib/api)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchProducts calls /api/products', async () => {
    const mockProducts = [{ id: '1', name: 'Running Top', price: 25 }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    });

    const products = await fetchProducts(false);
    expect(global.fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({ cache: 'no-store' }));
    expect(products).toEqual(mockProducts);
  });

  it('fetchProducts with all=true calls /api/products?all=true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await fetchProducts(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/products?all=true', expect.objectContaining({ cache: 'no-store' }));
  });


  it('saveProduct posts data to /api/products', async () => {
    const productPayload = { name: 'Vest', price: 20 };
    mockFetch.mockResolvedValueOnce({
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
    mockFetch.mockResolvedValueOnce({
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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'PRRC-1234', ...orderPayload }),
    });

    const result = await createOrder(orderPayload);
    expect(global.fetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.id).toBe('PRRC-1234');
  });

  it('lookupOrder calls /api/orders with orderRef and email query parameters', async () => {
    const mockOrder = { id: 'PRRC-1234', userEmail: 'runner@example.com', status: 'pending_payment' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrder,
    });

    const result = await lookupOrder('PRRC-1234', 'runner@example.com');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/orders?orderRef=PRRC-1234&email=runner%40example.com',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(result).toEqual(mockOrder);
  });

  it('verifyAdminPassword sends password to /api/admin/login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const isValid = await verifyAdminPassword('peasants2026!');
    expect(isValid).toBe(true);
  });

  it('getSignedUploadUrl posts fileName and contentType to /api/upload/signed-url', async () => {
    mockFetch.mockResolvedValueOnce({
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
    mockFetch
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
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/upload/signed-url') {
        const body = JSON.parse(typeof options?.body === 'string' ? options.body : '{}');
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
    mockFetch
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

  it('fetchFeatureFlags calls GET /api/feature-flags', async () => {
    const mockFlags = [{ id: 'store_closed', enabled: true }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFlags,
    });

    const flags = await fetchFeatureFlags();
    expect(global.fetch).toHaveBeenCalledWith('/api/feature-flags', expect.objectContaining({ cache: 'no-store' }));
    expect(flags).toEqual(mockFlags);
  });

  it('fetchFeatureFlag calls GET /api/feature-flags/:id and returns null on 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const notFound = await fetchFeatureFlag('unknown');
    expect(global.fetch).toHaveBeenCalledWith('/api/feature-flags/unknown', expect.objectContaining({ cache: 'no-store' }));
    expect(notFound).toBeNull();

    const mockFlag = { id: 'store_closed', enabled: false };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFlag,
    });

    const flag = await fetchFeatureFlag('store_closed');
    expect(flag).toEqual(mockFlag);
  });

  it('updateFeatureFlag sends PATCH to /api/feature-flags/:id', async () => {
    const updatedFlag = { id: 'store_closed', enabled: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedFlag,
    });

    const result = await updateFeatureFlag('store_closed', true);
    expect(global.fetch).toHaveBeenCalledWith('/api/feature-flags/store_closed', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    }));
    expect(result).toEqual(updatedFlag);
  });

  it('updateOrderStatus sends PATCH to /api/orders/:id/status without batchRef', async () => {
    const updatedOrder = { id: 'ORD-1', status: 'cancelled' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedOrder,
    });

    const result = await updateOrderStatus('ORD-1', 'cancelled');
    expect(global.fetch).toHaveBeenCalledWith('/api/orders/ORD-1/status', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    }));
    expect(result).toEqual(updatedOrder);
  });

  it('updateOrderStatus sends PATCH to /api/orders/:id/status with trimmed batchRef when provided', async () => {
    const updatedOrder = { id: 'ORD-1', status: 'order_sent', batchRef: 'BATCH-2026-OCT' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedOrder,
    });

    const result = await updateOrderStatus('ORD-1', 'order_sent', '  BATCH-2026-OCT  ');
    expect(global.fetch).toHaveBeenCalledWith('/api/orders/ORD-1/status', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'order_sent', batchRef: 'BATCH-2026-OCT' }),
    }));
    expect(result).toEqual(updatedOrder);
  });

  it('updateOrderStatus omits batchRef when it is empty string or whitespace', async () => {
    const updatedOrder = { id: 'ORD-1', status: 'order_sent' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedOrder,
    });

    const result = await updateOrderStatus('ORD-1', 'order_sent', '   ');
    expect(global.fetch).toHaveBeenCalledWith('/api/orders/ORD-1/status', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'order_sent' }),
    }));
    expect(result).toEqual(updatedOrder);
  });

  describe('Events API functions', () => {
    it('fetchEvents calls /api/events with and without includePast', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'evt-1' }] });
      const events = await fetchEvents(false);
      expect(global.fetch).toHaveBeenCalledWith('/api/events', { cache: 'no-store' });
      expect(events).toEqual([{ id: 'evt-1' }]);

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'evt-1' }] });
      await fetchEvents(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/events?includePast=true', { cache: 'no-store' });
    });

    it('fetchEventById calls /api/events/:id', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'evt-1' }) });
      const event = await fetchEventById('evt-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/events/evt-1', { cache: 'no-store' });
      expect(event).toEqual({ id: 'evt-1' });
    });

    it('createEvent, updateEvent, deleteEvent perform correct requests', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-evt' }) });
      await createEvent({ title: 'Party' });
      expect(global.fetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Party' }),
      }));

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'evt-1', title: 'Updated' }) });
      await updateEvent('evt-1', { title: 'Updated' });
      expect(global.fetch).toHaveBeenCalledWith('/api/events/evt-1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      }));

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true }) });
      await deleteEvent('evt-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/events/evt-1', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('purchaseEventTicket, fetchEventTickets, updateEventTicketStatus, resendEventTicketEmail, verifyEventTicketQr', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'tick-1' }) });
      await purchaseEventTicket('evt-1', { userName: 'User', userEmail: 'u@test.com' });
      expect(global.fetch).toHaveBeenCalledWith('/api/events/evt-1/tickets', expect.objectContaining({
        method: 'POST',
      }));

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'tick-1' }] });
      await fetchEventTickets('evt-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/events/evt-1/tickets', { cache: 'no-store' });

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'tick-1', status: 'completed' }) });
      await updateEventTicketStatus('tick-1', 'completed');
      expect(global.fetch).toHaveBeenCalledWith('/api/event-tickets/tick-1/status', expect.objectContaining({
        method: 'PATCH',
      }));

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
      await resendEventTicketEmail('tick-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/event-tickets/tick-1/resend-email', expect.objectContaining({
        method: 'POST',
      }));

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'checked_in_now' }) });
      await verifyEventTicketQr('uuid-123', 'evt-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/events/verify-qr', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ticketUuid: 'uuid-123', eventId: 'evt-1' }),
      }));
    });

    it('fetchOrders calls /api/orders or /api/orders?email=', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      await fetchOrders();
      expect(global.fetch).toHaveBeenCalledWith('/api/orders', { cache: 'no-store' });

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      await fetchOrders('user@test.com');
      expect(global.fetch).toHaveBeenCalledWith('/api/orders?email=user%40test.com', { cache: 'no-store' });
    });

    it('uploadImage falls back to multipart /api/upload when signed url fails', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Signed URL failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ imageUrl: 'https://storage/fallback.png' }),
        });

      const file = new File(['data'], 'test.png', { type: 'image/png' });
      const result = await uploadImage(file);
      expect(result).toBe('https://storage/fallback.png');
      expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
        method: 'POST',
      }));
    });
  });
});
