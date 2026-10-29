import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserOrdersUseCase } from './GetUserOrdersUseCase';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { Order } from '../entities/Order';

describe('GetUserOrdersUseCase', () => {
  let orderRepo: OrderRepositoryOutboundPort;
  let useCase: GetUserOrdersUseCase;

  const sampleOrder: Order = {
    id: 'PRRC-0001',
    userEmail: 'guest@example.com',
    userName: 'Guest Runner',
    items: [{ productId: 'p1', productName: 'Vest', price: 20, size: 'M', quantity: 1, subtotal: 20 }],
    totalAmount: 20,
    status: 'pending_payment',
    paymentLinkUrl: 'https://monzo.me/pay/PRRC-0001?amount=20',
    monzoReference: 'PRRC-0001',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    orderRepo = {
      createOrder: vi.fn(),
      getOrderById: vi.fn(),
      getOrdersByUserEmail: vi.fn(),
      getAllOrders: vi.fn(),
      updateOrderStatus: vi.fn(),
    };
    useCase = new GetUserOrdersUseCase(orderRepo);
  });

  it('delegates getOrdersForUser to orderRepo.getOrdersByUserEmail', async () => {
    vi.mocked(orderRepo.getOrdersByUserEmail).mockResolvedValue([sampleOrder]);
    const result = await useCase.getOrdersForUser('guest@example.com');
    expect(orderRepo.getOrdersByUserEmail).toHaveBeenCalledWith('guest@example.com');
    expect(result).toEqual([sampleOrder]);
  });

  it('delegates getAllOrders to orderRepo.getAllOrders', async () => {
    vi.mocked(orderRepo.getAllOrders).mockResolvedValue([sampleOrder]);
    const result = await useCase.getAllOrders();
    expect(orderRepo.getAllOrders).toHaveBeenCalledTimes(1);
    expect(result).toEqual([sampleOrder]);
  });

  it('includes event tickets from ticketRepo in getAllOrders and sorts by date descending', async () => {
    const mockTicketRepo = {
      createTicket: vi.fn(),
      getTicketById: vi.fn(),
      getTicketByUuid: vi.fn(),
      listTicketsByEvent: vi.fn(),
      listTicketsByEmail: vi.fn(),
      listAllTickets: vi.fn().mockResolvedValue([
        {
          id: 'PRRC-EVT-2026-0001',
          eventId: 'evt_1',
          eventTitle: 'Christmas Party',
          eventStartDate: '2026-12-19T19:30:00.000Z',
          eventAddress: 'Brentwood',
          userName: 'Event Attendee',
          userEmail: 'attendee@example.com',
          unitPrice: 25,
          status: 'pending_payment' as const,
          paymentLinkUrl: 'https://monzo.me/25',
          monzoReference: 'PRRC-EVT-2026-0001',
          ticketUuid: 'uuid-1',
          checkedIn: false,
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
      ]),
      updateTicket: vi.fn(),
      cancelTicketAndReleaseCapacity: vi.fn(),
      reserveAndCreateTicket: vi.fn(),
    };

    const useCaseWithTickets = new GetUserOrdersUseCase(orderRepo, mockTicketRepo);
    vi.mocked(orderRepo.getAllOrders).mockResolvedValue([sampleOrder]);

    const allOrders = await useCaseWithTickets.getAllOrders();
    expect(allOrders).toHaveLength(2);
    expect(allOrders[0].id).toBe('PRRC-EVT-2026-0001'); // Newer created date
    expect(allOrders[0].orderType).toBe('event_ticket');
    expect(allOrders[1].id).toBe('PRRC-0001');
  });

  describe('getOrderByRefAndEmail', () => {
    it('returns null if orderRef or email is empty', async () => {
      expect(await useCase.getOrderByRefAndEmail('', 'guest@example.com')).toBeNull();
      expect(await useCase.getOrderByRefAndEmail('PRRC-0001', '')).toBeNull();
      expect(orderRepo.getOrderById).not.toHaveBeenCalled();
    });

    it('returns order when reference and email match exactly', async () => {
      vi.mocked(orderRepo.getOrderById).mockResolvedValue(sampleOrder);
      const result = await useCase.getOrderByRefAndEmail('PRRC-0001', 'guest@example.com');
      expect(orderRepo.getOrderById).toHaveBeenCalledWith('PRRC-0001');
      expect(result).toEqual(sampleOrder);
    });

    it('matches case-insensitively on both reference and email', async () => {
      vi.mocked(orderRepo.getOrderById).mockImplementation(async (id) => {
        if (id === 'PRRC-0001') return sampleOrder;
        return null;
      });
      const result = await useCase.getOrderByRefAndEmail('prrc-0001', 'GUEST@EXAMPLE.COM');
      expect(result).toEqual(sampleOrder);
    });

    it('matches when reference is given without PRRC- prefix', async () => {
      vi.mocked(orderRepo.getOrderById).mockImplementation(async (id) => {
        if (id === 'PRRC-0001') return sampleOrder;
        return null;
      });
      const result = await useCase.getOrderByRefAndEmail('1', 'guest@example.com');
      expect(result).toEqual(sampleOrder);
    });

    it('returns null if order is not found by ID', async () => {
      vi.mocked(orderRepo.getOrderById).mockResolvedValue(null);
      const result = await useCase.getOrderByRefAndEmail('PRRC-9999', 'guest@example.com');
      expect(result).toBeNull();
    });

    it('returns null if order email does not match provided email', async () => {
      vi.mocked(orderRepo.getOrderById).mockResolvedValue(sampleOrder);
      const result = await useCase.getOrderByRefAndEmail('PRRC-0001', 'wrong@example.com');
      expect(result).toBeNull();
    });
  });
});
