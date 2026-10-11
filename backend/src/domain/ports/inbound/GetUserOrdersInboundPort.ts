import { Order } from '../../entities/Order';

export interface GetUserOrdersInboundPort {
  getOrdersForUser(email: string): Promise<Order[]>;
  getOrderByRefAndEmail(orderRef: string, email: string): Promise<Order | null>;
  getAllOrders(): Promise<Order[]>;
}
