import { Order } from '../../entities/Order';

export interface GetUserOrdersInboundPort {
  getOrdersForUser(email: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
}
