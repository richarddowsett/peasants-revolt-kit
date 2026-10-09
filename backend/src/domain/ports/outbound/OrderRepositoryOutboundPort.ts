import { Order, OrderStatus } from '../../entities/Order';

export interface OrderRepositoryOutboundPort {
  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentLinkUrl'>, paymentLinkUrl: string): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  getOrdersByUserEmail(email: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
}
