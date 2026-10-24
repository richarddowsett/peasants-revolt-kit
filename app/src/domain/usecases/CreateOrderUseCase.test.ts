import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateOrderUseCase, CreateOrderCommand } from './CreateOrderUseCase';
import { OrderRepositoryPort } from '../ports/OrderRepositoryPort';
import { PaymentGatewayPort } from '../ports/PaymentGatewayPort';
import { Order } from '../models/Order';

describe('CreateOrderUseCase (frontend domain)', () => {
  let orderRepo: OrderRepositoryPort;
  let paymentGateway: PaymentGatewayPort;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    orderRepo = {
      createOrder: vi.fn().mockImplementation((orderData, paymentLinkUrl) => {
        return Promise.resolve({
          id: 'PRRC-1001',
          ...orderData,
          paymentLinkUrl,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        } as Order);
      }),
      getAllOrders: vi.fn().mockResolvedValue([]),
      getOrderById: vi.fn().mockResolvedValue(null),
      getOrdersByUserEmail: vi.fn().mockResolvedValue([]),
      updateOrderStatus: vi.fn(),
    };

    paymentGateway = {
      generatePaymentLink: vi.fn().mockReturnValue('https://monzo.me/pay/PRRC-1001?amount=25'),
      getGatewayName: vi.fn().mockReturnValue('monzo'),
    };

    useCase = new CreateOrderUseCase(orderRepo, paymentGateway);
  });

  it('should throw an error if items array is missing or empty', async () => {
    const invalidCommand = {
      userEmail: 'test@example.com',
      userName: 'Runner',
      items: [],
    } as CreateOrderCommand;

    await expect(useCase.execute(invalidCommand)).rejects.toThrow(
      'Order must contain at least one item.'
    );
  });

  it('should throw an error if userName is missing or whitespace', async () => {
    const commandWithoutName = {
      userEmail: 'test@example.com',
      userName: '   ',
      items: [{ productId: 'p1', productName: 'Tee', price: 25, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithoutName)).rejects.toThrow(
      'Customer name is required.'
    );
  });

  it('should throw an error if userEmail is missing or whitespace', async () => {
    const commandWithoutEmail = {
      userEmail: '   ',
      userName: 'Alex Smith',
      items: [{ productId: 'p1', productName: 'Tee', price: 25, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithoutEmail)).rejects.toThrow(
      'Customer email is required.'
    );
  });

  it('should throw an error if userEmail is invalid', async () => {
    const commandWithInvalidEmail = {
      userEmail: 'invalid-email',
      userName: 'Alex Smith',
      items: [{ productId: 'p1', productName: 'Tee', price: 25, size: 'M', quantity: 1 }],
    } as CreateOrderCommand;

    await expect(useCase.execute(commandWithInvalidEmail)).rejects.toThrow(
      'A valid customer email is required.'
    );
  });

  it('should create order successfully and trim customer name and email', async () => {
    const command: CreateOrderCommand = {
      userEmail: '  runner@example.com  ',
      userName: '  Alex Smith  ',
      items: [{ productId: 'p1', productName: 'Tee', price: 25, size: 'M', quantity: 1 }],
    };

    const order = await useCase.execute(command);
    expect(order.userName).toBe('Alex Smith');
    expect(order.userEmail).toBe('runner@example.com');
    expect(order.totalAmount).toBe(25);
    expect(orderRepo.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: 'Alex Smith',
        userEmail: 'runner@example.com',
      }),
      'https://monzo.me/pay/PRRC-1001?amount=25'
    );
  });
});
