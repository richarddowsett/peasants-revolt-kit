import { GetUserOrdersInboundPort } from '../ports/inbound/GetUserOrdersInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { Order } from '../entities/Order';

export class GetUserOrdersUseCase implements GetUserOrdersInboundPort {
  constructor(private orderRepo: OrderRepositoryOutboundPort) {}

  async getOrdersForUser(email: string): Promise<Order[]> {
    return this.orderRepo.getOrdersByUserEmail(email);
  }

  async getOrderByRefAndEmail(orderRef: string, email: string): Promise<Order | null> {
    if (!orderRef || !email) {
      return null;
    }
    const trimmedRef = orderRef.trim();
    const normalizedEmail = email.trim().toLowerCase();

    let order = await this.orderRepo.getOrderById(trimmedRef);
    if (!order && trimmedRef !== trimmedRef.toUpperCase()) {
      order = await this.orderRepo.getOrderById(trimmedRef.toUpperCase());
    }

    if (!order && !trimmedRef.toUpperCase().startsWith('PRRC-')) {
      const prefixed = `PRRC-${trimmedRef.toUpperCase().padStart(4, '0')}`;
      order = await this.orderRepo.getOrderById(prefixed);
    }

    if (!order) {
      return null;
    }

    if (order.userEmail.trim().toLowerCase() !== normalizedEmail) {
      return null;
    }

    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepo.getAllOrders();
  }
}

