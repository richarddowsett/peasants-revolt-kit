import { UpdateOrderStatusInboundPort } from '../ports/inbound/UpdateOrderStatusInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { Order, OrderStatus } from '../entities/Order';

export class UpdateOrderStatusUseCase implements UpdateOrderStatusInboundPort {
  constructor(private orderRepo: OrderRepositoryOutboundPort) {}

  async execute(orderId: string, status: OrderStatus): Promise<Order> {
    return this.orderRepo.updateOrderStatus(orderId, status);
  }
}
