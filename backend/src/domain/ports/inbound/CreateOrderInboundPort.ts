import { Order, OrderItem } from '../../entities/Order';

export interface CreateOrderCommand {
  userEmail: string;
  userName: string;
  userId?: string;
  items: Omit<OrderItem, 'subtotal'>[];
}

export interface CreateOrderInboundPort {
  execute(command: CreateOrderCommand): Promise<Order>;
}
