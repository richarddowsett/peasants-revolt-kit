import { Order, OrderStatus } from '../../entities/Order';

export interface UpdateOrderStatusInboundPort {
  execute(orderId: string, status: OrderStatus): Promise<Order>;
}
