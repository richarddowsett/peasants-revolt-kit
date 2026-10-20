import { Order, OrderStatus } from '../../entities/Order';

export interface UpdateOrderStatusInboundPort {
  execute(orderId: string, status: OrderStatus, batchRef?: string): Promise<Order>;
  resendTicketEmail?(orderId: string): Promise<Order>;
}

