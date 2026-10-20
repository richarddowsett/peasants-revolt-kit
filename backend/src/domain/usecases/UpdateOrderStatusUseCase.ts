import crypto from 'crypto';
import { UpdateOrderStatusInboundPort } from '../ports/inbound/UpdateOrderStatusInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { EmailOutboundPort } from '../ports/outbound/EmailOutboundPort';
import { ChristmasPartySettingsRepositoryOutboundPort } from '../ports/outbound/ChristmasPartySettingsRepositoryOutboundPort';
import { Order, OrderStatus } from '../entities/Order';
import {
  DEFAULT_CHRISTMAS_FROM_EMAIL,
  isChristmasTicketOrderType,
} from '../entities/ChristmasPartySettings';

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
    private emailPort?: EmailOutboundPort,
    private christmasSettingsRepo?: ChristmasPartySettingsRepositoryOutboundPort
  ) {}

  async execute(orderId: string, status: OrderStatus, batchRef?: string): Promise<Order> {
    if (!VALID_ORDER_STATUSES.includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }
    let updatedOrder =
      batchRef !== undefined
        ? await this.orderRepo.updateOrderStatus(orderId, status, batchRef)
        : await this.orderRepo.updateOrderStatus(orderId, status);

    if (
      status === 'payment_successful' &&
      isChristmasTicketOrderType(updatedOrder.orderType)
    ) {
      updatedOrder = await this.deliverTicketEmail(updatedOrder);
    }

    return updatedOrder;
  }

  async resendTicketEmail(orderId: string): Promise<Order> {
    const order = await this.orderRepo.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    if (!isChristmasTicketOrderType(order.orderType)) {
      throw new Error(`Order ${orderId} is not a Christmas party ticket order`);
    }
    return this.deliverTicketEmail(order);
  }

  private async deliverTicketEmail(order: Order): Promise<Order> {
    let currentOrder = order;
    if (!currentOrder.ticketUuid) {
      const ticketUuid = crypto.randomUUID();
      if (this.orderRepo.updateOrderFields) {
        currentOrder = await this.orderRepo.updateOrderFields(currentOrder.id, { ticketUuid });
      } else {
        currentOrder = { ...currentOrder, ticketUuid };
      }
    }

    if (!this.emailPort) {
      return currentOrder;
    }

    const settings = this.christmasSettingsRepo
      ? await this.christmasSettingsRepo.getSettings()
      : {
          eventYear: currentOrder.eventYear || new Date().getFullYear(),
          saleStartAt: '',
          maxTickets: 50,
          ticketPrice: currentOrder.totalAmount,
          partyDateTime: '',
          partyLocation: 'TBA',
          fromEmail: DEFAULT_CHRISTMAS_FROM_EMAIL,
          updatedAt: new Date().toISOString(),
        };

    const result = await this.emailPort.sendChristmasPartyTicketEmail(currentOrder, settings);
    if (result.sent) {
      const ticketEmailSentAt = new Date().toISOString();
      if (this.orderRepo.updateOrderFields) {
        currentOrder = await this.orderRepo.updateOrderFields(currentOrder.id, {
          ticketEmailSentAt,
        });
      } else {
        currentOrder = { ...currentOrder, ticketEmailSentAt };
      }
    }

    return currentOrder;
  }
}

