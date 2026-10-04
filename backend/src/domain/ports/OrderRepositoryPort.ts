import { Order, OrderStatus } from '../models/Order';

export interface OrderRepositoryPort {
  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentLinkUrl'>, paymentLinkUrl: string): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  getOrdersByUserEmail(email: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
}
