import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { OrdersController } from './OrdersController';
import { CreateOrderInboundPort } from '../../../domain/ports/inbound/CreateOrderInboundPort';
import { GetUserOrdersInboundPort } from '../../../domain/ports/inbound/GetUserOrdersInboundPort';
import { UpdateOrderStatusInboundPort } from '../../../domain/ports/inbound/UpdateOrderStatusInboundPort';
import { Order } from '../../../domain/entities/Order';

describe('OrdersController', () => {
  let createOrderUseCase: CreateOrderInboundPort;
  let getUserOrdersUseCase: GetUserOrdersInboundPort;
  let updateOrderStatusUseCase: UpdateOrderStatusInboundPort;
  let controller: OrdersController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockOrder: Order = {
    id: 'ord-1',
    userEmail: 'user@example.com',
    userName: 'Jane Doe',
    items: [
      {
        productId: 'prod-1',
        productName: 'Jacket',
        price: 50,
        size: 'M',
        quantity: 1,
        subtotal: 50,
      },
    ],
    totalAmount: 50,
    status: 'pending_payment',
    paymentLinkUrl: 'https://monzo.me/pay/PRRC-1111?amount=50',
    monzoReference: 'PRRC-1111',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    createOrderUseCase = {
      execute: vi.fn().mockResolvedValue(mockOrder),
    };

    getUserOrdersUseCase = {
      getOrdersForUser: vi.fn().mockResolvedValue([mockOrder]),
      getOrderByRefAndEmail: vi.fn().mockResolvedValue(mockOrder),
      getAllOrders: vi.fn().mockResolvedValue([mockOrder]),
    };

    updateOrderStatusUseCase = {
      execute: vi.fn().mockResolvedValue({ ...mockOrder, status: 'completed' }),
    };

    controller = new OrdersController(
      createOrderUseCase,
      getUserOrdersUseCase,
      updateOrderStatusUseCase
    );

    req = {
      query: {},
      params: {},
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('createOrder', () => {
    it('should create order and return status 201 with order JSON', async () => {
      const orderBody = {
        userEmail: 'user@example.com',
        userName: 'Jane Doe',
        items: [{ productId: 'prod-1', productName: 'Jacket', price: 50, size: 'M', quantity: 1 }],
      };
      req.body = orderBody;

      await controller.createOrder(req as Request, res as Response);

      expect(createOrderUseCase.execute).toHaveBeenCalledWith(orderBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockOrder);
    });

    it('should respond with status 400 when createOrderUseCase throws an error', async () => {
      vi.mocked(createOrderUseCase.execute).mockRejectedValueOnce(
        new Error('Order must contain at least one item.')
      );

      await controller.createOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Order must contain at least one item.' });
    });
  });

  describe('getOrders', () => {
    it('should fetch user orders by email when query.email is provided', async () => {
      req.query = { email: 'user@example.com' };

      await controller.getOrders(req as Request, res as Response);

      expect(getUserOrdersUseCase.getOrdersForUser).toHaveBeenCalledWith('user@example.com');
      expect(getUserOrdersUseCase.getAllOrders).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockOrder]);
    });

    it('should fetch all orders when query.email is not provided', async () => {
      req.query = {};

      await controller.getOrders(req as Request, res as Response);

      expect(getUserOrdersUseCase.getAllOrders).toHaveBeenCalledTimes(1);
      expect(getUserOrdersUseCase.getOrdersForUser).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockOrder]);
    });

    it('should fetch single order by ref and email when query.orderRef and query.email are provided', async () => {
      req.query = { orderRef: 'PRRC-1111', email: 'user@example.com' };

      await controller.getOrders(req as Request, res as Response);

      expect(getUserOrdersUseCase.getOrderByRefAndEmail).toHaveBeenCalledWith(
        'PRRC-1111',
        'user@example.com'
      );
      expect(res.json).toHaveBeenCalledWith(mockOrder);
    });

    it('should respond with 404 when orderRef and email do not match any order', async () => {
      req.query = { orderRef: 'PRRC-9999', email: 'user@example.com' };
      vi.mocked(getUserOrdersUseCase.getOrderByRefAndEmail).mockResolvedValueOnce(null);

      await controller.getOrders(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No order found matching that reference and email.',
      });
    });

    it('should respond with 400 when orderRef is provided without email', async () => {
      req.query = { orderRef: 'PRRC-1111' };

      await controller.getOrders(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email address is required to track an order.',
      });
    });

    it('should respond with status 500 when getUserOrdersUseCase throws an error', async () => {
      vi.mocked(getUserOrdersUseCase.getAllOrders).mockRejectedValueOnce(
        new Error('Failed to fetch orders')
      );

      await controller.getOrders(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch orders' });
    });
  });

  describe('updateStatus', () => {
    it('should update order status and return order JSON', async () => {
      req.params = { id: 'ord-1' };
      req.body = { status: 'completed' };

      await controller.updateStatus(req as Request, res as Response);

      expect(updateOrderStatusUseCase.execute).toHaveBeenCalledWith('ord-1', 'completed');
      expect(res.json).toHaveBeenCalledWith({ ...mockOrder, status: 'completed' });
    });

    it('should update order status to order_sent and return order JSON', async () => {
      req.params = { id: 'ord-1' };
      req.body = { status: 'order_sent' };
      vi.mocked(updateOrderStatusUseCase.execute).mockResolvedValueOnce({
        ...mockOrder,
        status: 'order_sent',
      });

      await controller.updateStatus(req as Request, res as Response);

      expect(updateOrderStatusUseCase.execute).toHaveBeenCalledWith('ord-1', 'order_sent');
      expect(res.json).toHaveBeenCalledWith({ ...mockOrder, status: 'order_sent' });
    });

    it('should respond with status 400 when updateOrderStatusUseCase throws an error', async () => {
      req.params = { id: 'ord-1' };
      req.body = { status: 'invalid_status' };
      vi.mocked(updateOrderStatusUseCase.execute).mockRejectedValueOnce(
        new Error('Invalid order status')
      );

      await controller.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid order status' });
    });
  });
});
