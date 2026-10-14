import { UpdateOrderStatusInboundPort } from '../ports/inbound/UpdateOrderStatusInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { Order, OrderStatus } from '../entities/Order';

export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'pending_payment',
  'payment_successful',
  'order_sent',
  'completed',
  'cancelled',
];

export class UpdateOrderStatusUseCase implements UpdateOrderStatusInboundPort {
  constructor(private orderRepo: OrderRepositoryOutboundPort) {}

  async execute(orderId: string, status: OrderStatus): Promise<Order> {
    if (!VALID_ORDER_STATUSES.includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }
    return this.orderRepo.updateOrderStatus(orderId, status);
  }
}
