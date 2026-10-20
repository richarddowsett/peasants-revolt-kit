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

  it('updates order status with optional batchRef', async () => {
    orderRepo.updateOrderStatus = vi.fn().mockImplementation(async (id, status, batchRef) => ({
      ...mockOrder,
      id,
      status,
      batchRef,
      updatedAt: '2026-01-01T01:00:00Z',
    }));

    const result = await useCase.execute('PRRC-1001', 'order_sent', 'PRRC-BATCH-001');

    expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith(
      'PRRC-1001',
      'order_sent',
      'PRRC-BATCH-001'
    );
    expect(result.status).toBe('order_sent');
    expect(result.batchRef).toBe('PRRC-BATCH-001');
  });

  it('updates order status without batchRef when not provided', async () => {
    const result = await useCase.execute('PRRC-1001', 'order_sent');

    expect(orderRepo.updateOrderStatus).toHaveBeenCalledWith('PRRC-1001', 'order_sent');
    expect(result.status).toBe('order_sent');
  });

  it('sends a Christmas party QR ticket email when a christmas_yyyy_ticket order is marked payment_successful', async () => {
    const christmasOrder: Order = {
      ...mockOrder,
      id: 'PRRC-XMAS-2026-0001',
      monzoReference: 'PRRC-XMAS-2026-0001',
      orderType: 'christmas_2026_ticket',
      ticketUuid: '550e8400-e29b-41d4-a716-446655440000',
      eventYear: 2026,
    };

    orderRepo.updateOrderStatus = vi.fn().mockResolvedValue({
      ...christmasOrder,
      status: 'payment_successful',
    });
    orderRepo.updateOrderFields = vi.fn().mockImplementation(async (id, fields) => ({
      ...christmasOrder,
      status: 'payment_successful',
      ...fields,
    }));

    const emailPort = {
      sendChristmasPartyTicketEmail: vi.fn().mockResolvedValue({ sent: true, messageId: 'msg_1' }),
    };
    const settingsRepo = {
      getSettings: vi.fn().mockResolvedValue({
        eventYear: 2026,
        saleStartAt: '2026-11-01T09:00:00Z',
        maxTickets: 50,
        ticketPrice: 25,
        partyDateTime: '2026-12-18T19:30:00Z',
        partyLocation: 'The Brentwood Tap',
        fromEmail: 'Peasants Running Club <christmas@peasants-running-kit.store>',
        updatedAt: '2026-10-01T00:00:00Z',
      }),
      saveSettings: vi.fn(),
    };

    const christmasUseCase = new UpdateOrderStatusUseCase(orderRepo, emailPort, settingsRepo);
    const updated = await christmasUseCase.execute('PRRC-XMAS-2026-0001', 'payment_successful');

    expect(emailPort.sendChristmasPartyTicketEmail).toHaveBeenCalledTimes(1);
    expect(updated.ticketEmailSentAt).toBeDefined();
  });
});

