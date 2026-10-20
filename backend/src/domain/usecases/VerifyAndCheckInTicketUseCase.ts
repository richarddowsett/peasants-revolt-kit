import {
  VerifyAndCheckInTicketInboundPort,
  TicketVerificationResult,
} from '../ports/inbound/VerifyAndCheckInTicketInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';

export class VerifyAndCheckInTicketUseCase implements VerifyAndCheckInTicketInboundPort {
  constructor(private orderRepo: OrderRepositoryOutboundPort) {}

  async execute(ticketUuid: string): Promise<TicketVerificationResult> {
    const trimmedUuid = (ticketUuid || '').trim();
    if (!trimmedUuid) {
      return {
        valid: false,
        reason: 'NOT_FOUND',
        message: 'No ticket QR code UUID provided.',
      };
    }

    let order = this.orderRepo.getOrderByTicketUuid
      ? await this.orderRepo.getOrderByTicketUuid(trimmedUuid)
      : null;

    if (!order) {
      const allOrders = await this.orderRepo.getAllOrders();
      order =
        allOrders.find(
          (o) => o.ticketUuid && o.ticketUuid.toLowerCase() === trimmedUuid.toLowerCase()
        ) || null;
    }

    if (!order) {
      return {
        valid: false,
        reason: 'NOT_FOUND',
        message: 'Invalid QR code: Ticket UUID not found in the database.',
      };
    }

    if (order.status !== 'payment_successful' && order.status !== 'completed') {
      return {
        valid: false,
        reason: 'UNPAID',
        message: `Ticket payment has not been confirmed (Status: ${order.status}).`,
        order,
      };
    }

    if (order.checkedIn) {
      return {
        valid: false,
        reason: 'ALREADY_CHECKED_IN',
        message: `Ticket has already been scanned and checked in${
          order.checkedInAt ? ` at ${new Date(order.checkedInAt).toLocaleString('en-GB')}` : ''
        }.`,
        order,
      };
    }

    const checkedInAt = new Date().toISOString();
    let updatedOrder = order;
    if (this.orderRepo.updateOrderFields) {
      updatedOrder = await this.orderRepo.updateOrderFields(order.id, {
        checkedIn: true,
        checkedInAt,
        status: 'completed',
      });
    } else {
      updatedOrder = await this.orderRepo.updateOrderStatus(order.id, 'completed');
      updatedOrder = {
        ...updatedOrder,
        checkedIn: true,
        checkedInAt,
      };
    }

    return {
      valid: true,
      reason: 'CHECKED_IN',
      message: `Entry confirmed for ${updatedOrder.userName}!`,
      order: updatedOrder,
    };
  }
}
