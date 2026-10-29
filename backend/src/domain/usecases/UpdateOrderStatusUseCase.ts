import { UpdateOrderStatusInboundPort } from '../ports/inbound/UpdateOrderStatusInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { UpdateEventTicketStatusInboundPort } from '../ports/inbound/EventInboundPorts';
import { Order, OrderStatus } from '../entities/Order';
import { mapEventTicketToOrder, EventTicketStatus } from '../entities/ClubEvent';

export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'pending_payment',
  'payment_successful',
  'order_sent',
  'completed',
  'cancelled',
];

export class UpdateOrderStatusUseCase implements UpdateOrderStatusInboundPort {
  constructor(
    private orderRepo: OrderRepositoryOutboundPort,
    private updateEventTicketStatusUseCase?: UpdateEventTicketStatusInboundPort
  ) {}

  async execute(orderId: string, status: OrderStatus, batchRef?: string): Promise<Order> {
    if (!VALID_ORDER_STATUSES.includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }

    if (orderId.toUpperCase().startsWith('PRRC-EVT-') && this.updateEventTicketStatusUseCase) {
      const ticket = await this.updateEventTicketStatusUseCase.execute(
        orderId,
        status as EventTicketStatus
      );
      return mapEventTicketToOrder(ticket);
    }

    return batchRef !== undefined
      ? this.orderRepo.updateOrderStatus(orderId, status, batchRef)
      : this.orderRepo.updateOrderStatus(orderId, status);
  }
}
