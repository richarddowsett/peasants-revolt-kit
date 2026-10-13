import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateOrderUseCase } from './CreateOrderUseCase';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { PaymentGatewayOutboundPort } from '../ports/outbound/PaymentGatewayOutboundPort';
import { CreateOrderCommand } from '../ports/inbound/CreateOrderInboundPort';
import { Order } from '../entities/Order';

describe('CreateOrderUseCase', () => {
  let orderRepo: OrderRepositoryOutboundPort;
  let paymentGateway: PaymentGatewayOutboundPort;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    orderRepo = {
      createOrder: vi.fn().mockImplementation((orderData, paymentLinkUrl) => {
        return Promise.resolve({
          id: 'order-123',
          ...orderData,
          paymentLinkUrl,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        } as Order);
      }),
      getOrdersByEmail: vi.fn(),
      getAllOrders: vi.fn(),
      updateOrderStatus: vi.fn(),
    };

    paymentGateway = {
      generatePaymentLink: vi.fn().mockReturnValue('https://monzo.me/pay/PRRC-1234?amount=30'),
    };

    useCase = new CreateOrderUseCase(orderRepo, paymentGateway);
  });

  it('should throw an error if items array is missing or empty', async () => {
    const invalidCommand1 = {
      userEmail: 'test@example.com',
      userName: 'Runner',
      items: [],
    } as CreateOrderCommand;

    await expect(useCase.execute(invalidCommand1)).rejects.toThrow(
      'Order must contain at least one item.'
    );

    const invalidCommand2 = {
      userEmail: 'test@example.com',
      userName: 'Runner',
      items: undefined as any,
    } as CreateOrderCommand;

    await expect(useCase.execute(invalidCommand2)).rejects.toThrow(
      'Order must contain at least one item.'
    );
  });

  it('should throw an error if userName is missing or whitespace', async () => {
    const commandWithoutName = {
      userEmail: 'test@example.com',
      userName: '',
      items: [{ productId: 'p1', productName: 'Tee', price: 20, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithoutName)).rejects.toThrow(
      'Customer name is required.'
    );

    const commandWithWhitespaceName = {
      userEmail: 'test@example.com',
      userName: '   ',
      items: [{ productId: 'p1', productName: 'Tee', price: 20, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithWhitespaceName)).rejects.toThrow(
      'Customer name is required.'
    );
  });

  it('should throw an error if userEmail is missing or whitespace', async () => {
    const commandWithoutEmail = {
      userEmail: '',
      userName: 'Alex Smith',
      items: [{ productId: 'p1', productName: 'Tee', price: 20, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithoutEmail)).rejects.toThrow(
      'Customer email is required.'
    );

    const commandWithWhitespaceEmail = {
      userEmail: '   ',
      userName: 'Alex Smith',
      items: [{ productId: 'p1', productName: 'Tee', price: 20, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithWhitespaceEmail)).rejects.toThrow(
      'Customer email is required.'
    );
  });

  it('should throw an error if userEmail is not a valid email address', async () => {
    const commandWithInvalidEmail = {
      userEmail: 'not-an-email',
      userName: 'Alex Smith',
      items: [{ productId: 'p1', productName: 'Tee', price: 20, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithInvalidEmail)).rejects.toThrow(
      'A valid customer email is required.'
    );
  });

  it('should calculate item subtotals and total amount correctly', async () => {
    const command: CreateOrderCommand = {
      userEmail: 'runner@example.com',
      userName: 'Fast Runner',
      userId: 'user-456',
      items: [
        {
          productId: 'p1',
          productName: 'Running Tee',
          price: 25,
          size: 'M',
          quantity: 2,
        },
        {
          productId: 'p2',
          productName: 'Water Bottle',
          price: 10,
          size: 'One Size',
          quantity: 1,
        },
      ],
    };

    const order = await useCase.execute(command);

    expect(order.items).toEqual([
      {
        productId: 'p1',
        productName: 'Running Tee',
        price: 25,
        size: 'M',
        quantity: 2,
        subtotal: 50,
      },
      {
        productId: 'p2',
        productName: 'Water Bottle',
        price: 10,
        size: 'One Size',
        quantity: 1,
        subtotal: 10,
      },
    ]);
    expect(order.totalAmount).toBe(60);
    expect(paymentGateway.generatePaymentLink).toHaveBeenCalledWith(
      expect.stringMatching(/^PRRC-\d{4}$/),
      60
    );
    expect(orderRepo.createOrder).toHaveBeenCalledWith(
      {
        id: expect.stringMatching(/^PRRC-\d{4}$/),
        userEmail: 'runner@example.com',
        userName: 'Fast Runner',
        userId: 'user-456',
        items: [
          {
            productId: 'p1',
            productName: 'Running Tee',
            price: 25,
            size: 'M',
            quantity: 2,
            subtotal: 50,
          },
          {
            productId: 'p2',
            productName: 'Water Bottle',
            price: 10,
            size: 'One Size',
            quantity: 1,
            subtotal: 10,
          },
        ],
        totalAmount: 60,
        status: 'pending_payment',
        monzoReference: expect.stringMatching(/^PRRC-\d{4}$/),
      },
      'https://monzo.me/pay/PRRC-1234?amount=30'
    );
  });

  it('should handle optional userId field gracefully when not provided', async () => {
    const command: CreateOrderCommand = {
      userEmail: 'guest@example.com',
      userName: 'Guest Runner',
      items: [
        {
          productId: 'p1',
          productName: 'Cap',
          price: 15,
          size: 'L',
          quantity: 1,
        },
      ],
    };

    const order = await useCase.execute(command);

    expect(order.userId).toBeUndefined();
    expect(order.userEmail).toBe('guest@example.com');
    expect(order.userName).toBe('Guest Runner');
    expect(order.totalAmount).toBe(15);
    expect(order.status).toBe('pending_payment');
  });

  it('should throw an error if store_closed feature flag is enabled', async () => {
    const mockFlagRepo = {
      getFeatureFlag: vi.fn().mockResolvedValue({
        id: 'store_closed',
        name: 'Store Closed',
        enabled: true,
        updatedAt: '2026-01-01T00:00:00Z',
      }),
      getAllFeatureFlags: vi.fn(),
      setFeatureFlag: vi.fn(),
    };

    const closedUseCase = new CreateOrderUseCase(orderRepo, paymentGateway, mockFlagRepo);

    const command: CreateOrderCommand = {
      userEmail: 'runner@example.com',
      userName: 'Fast Runner',
      items: [{ productId: 'p1', productName: 'Cap', price: 15, size: 'L', quantity: 1 }],
    };

    await expect(closedUseCase.execute(command)).rejects.toThrow(
      'The store is currently closed for new orders.'
    );
    expect(mockFlagRepo.getFeatureFlag).toHaveBeenCalledWith('store_closed');
    expect(orderRepo.createOrder).not.toHaveBeenCalled();
  });

  it('should allow order creation if store_closed feature flag is disabled', async () => {
    const mockFlagRepo = {
      getFeatureFlag: vi.fn().mockResolvedValue({
        id: 'store_closed',
        name: 'Store Closed',
        enabled: false,
        updatedAt: '2026-01-01T00:00:00Z',
      }),
      getAllFeatureFlags: vi.fn(),
      setFeatureFlag: vi.fn(),
    };

    const openUseCase = new CreateOrderUseCase(orderRepo, paymentGateway, mockFlagRepo);

    const command: CreateOrderCommand = {
      userEmail: 'runner@example.com',
      userName: 'Fast Runner',
      items: [{ productId: 'p1', productName: 'Cap', price: 15, size: 'L', quantity: 1 }],
    };

    const order = await openUseCase.execute(command);
    expect(order).toBeDefined();
    expect(order.id).toMatch(/^PRRC-\d{4}$/);
  });
});

