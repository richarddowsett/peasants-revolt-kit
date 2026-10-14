import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateOrderStatusUseCase, VALID_ORDER_STATUSES } from './UpdateOrderStatusUseCase';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { Order } from '../entities/Order';

describe('UpdateOrderStatusUseCase', () => {
  let orderRepo: OrderRepositoryOutboundPort;
  let useCase: UpdateOrderStatusUseCase;

  const mockOrder: Order = {
    id: 'PRRC-1001',
    userEmail: 'runner@example.com',
    userName: 'John Doe',
    items: [],
    totalAmount: 25,
    status: 'pending_payment',
    paymentLinkUrl: 'https://monzo.me/test',
    monzoReference: 'PRRC-1001',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    orderRepo = {
      saveOrder: vi.fn(),
      getOrderById: vi.fn(),
      getOrdersByEmail: vi.fn(),
      getAllOrders: vi.fn(),
      updateOrderStatus: vi.fn().mockImplementation(async (id, status) => ({
        ...mockOrder,
        id,
        status,
        updatedAt: '2026-01-01T01:00:00Z',
      })),
    };
    useCase = new UpdateOrderStatusUseCase(orderRepo);
  });

  it('updates order status to cancelled successfully', async () => {
    const result = await useCase.execute('PRRC-1001', 'cancelled');

    expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith('PRRC-1001', 'cancelled');
    expect(result.status).toBe('cancelled');
  });

  it('supports all valid statuses', async () => {
    for (const status of VALID_ORDER_STATUSES) {
      const result = await useCase.execute('PRRC-1001', status);
      expect(result.status).toBe(status);
    }
  });

  it('throws an error when status is invalid', async () => {
    await expect(useCase.execute('PRRC-1001', 'invalid_status' as any)).rejects.toThrow(
      'Invalid order status: invalid_status'
    );
    expect(orderRepo.updateOrderStatus).not.toHaveBeenCalled();
  });
});
