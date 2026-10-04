import { OrderRepositoryPort } from '../ports/OrderRepositoryPort';
import { Order } from '../models/Order';

export class GetUserOrdersUseCase {
  constructor(private orderRepo: OrderRepositoryPort) {}

  async getOrdersForUser(email: string): Promise<Order[]> {
    return this.orderRepo.getOrdersByUserEmail(email);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepo.getAllOrders();
  }
}
