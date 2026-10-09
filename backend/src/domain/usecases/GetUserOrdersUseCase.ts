import { GetUserOrdersInboundPort } from '../ports/inbound/GetUserOrdersInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { Order } from '../entities/Order';

export class GetUserOrdersUseCase implements GetUserOrdersInboundPort {
  constructor(private orderRepo: OrderRepositoryOutboundPort) {}

  async getOrdersForUser(email: string): Promise<Order[]> {
    return this.orderRepo.getOrdersByUserEmail(email);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepo.getAllOrders();
  }
}
