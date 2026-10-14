import { OrderRepositoryPort } from '../ports/OrderRepositoryPort';
import { Order, OrderStatus } from '../models/Order';

export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'pending_payment',
  'payment_successful',
  'order_sent',
  'completed',
  'cancelled',
];

export class UpdateOrderStatusUseCase {
  constructor(private orderRepo: OrderRepositoryPort) {}

  async execute(orderId: string, status: OrderStatus, batchRef?: string): Promise<Order> {
    if (!VALID_ORDER_STATUSES.includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }
    return batchRef !== undefined
      ? this.orderRepo.updateOrderStatus(orderId, status, batchRef)
      : this.orderRepo.updateOrderStatus(orderId, status);
  }
}
