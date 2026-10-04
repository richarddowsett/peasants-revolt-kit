import { OrderRepositoryPort } from '../ports/OrderRepositoryPort';
import { Order, OrderStatus } from '../models/Order';

export class UpdateOrderStatusUseCase {
  constructor(private orderRepo: OrderRepositoryPort) {}

  async execute(orderId: string, status: OrderStatus): Promise<Order> {
    return this.orderRepo.updateOrderStatus(orderId, status);
  }
}
