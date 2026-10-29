import { GetUserOrdersInboundPort } from '../ports/inbound/GetUserOrdersInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { EventTicketRepositoryOutboundPort } from '../ports/outbound/EventTicketRepositoryOutboundPort';
import { Order } from '../entities/Order';
import { mapEventTicketToOrder } from '../entities/ClubEvent';

export class GetUserOrdersUseCase implements GetUserOrdersInboundPort {
  constructor(
    private orderRepo: OrderRepositoryOutboundPort,
    private ticketRepo?: EventTicketRepositoryOutboundPort
  ) {}

  async getOrdersForUser(email: string): Promise<Order[]> {
    const kitOrders = await this.orderRepo.getOrdersByUserEmail(email);
    if (!this.ticketRepo) {
      return kitOrders;
    }

    const tickets = await this.ticketRepo.listTicketsByEmail(email);
    const ticketOrders = tickets.map(mapEventTicketToOrder);
    return [...kitOrders, ...ticketOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

    if (order && order.userEmail.trim().toLowerCase() === normalizedEmail) {
      return order;
    }

    if (this.ticketRepo) {
      let ticket = await this.ticketRepo.getTicketById(trimmedRef);
      if (!ticket && trimmedRef !== trimmedRef.toUpperCase()) {
        ticket = await this.ticketRepo.getTicketById(trimmedRef.toUpperCase());
      }
      if (ticket && ticket.userEmail.trim().toLowerCase() === normalizedEmail) {
        return mapEventTicketToOrder(ticket);
      }
    }

    return null;
  }

  async getAllOrders(): Promise<Order[]> {
    const kitOrders = await this.orderRepo.getAllOrders();
    if (!this.ticketRepo) {
      return kitOrders;
    }

    const tickets = await this.ticketRepo.listAllTickets();
    const ticketOrders = tickets.map(mapEventTicketToOrder);
    return [...kitOrders, ...ticketOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
