import crypto from 'crypto';
import {
  PurchaseChristmasTicketInboundPort,
  PurchaseChristmasTicketInput,
} from '../ports/inbound/PurchaseChristmasTicketInboundPort';
import { ChristmasPartySettingsRepositoryOutboundPort } from '../ports/outbound/ChristmasPartySettingsRepositoryOutboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { PaymentGatewayOutboundPort } from '../ports/outbound/PaymentGatewayOutboundPort';
import { Order } from '../entities/Order';
import { getChristmasTicketOrderType } from '../entities/ChristmasPartySettings';
import { generateNextChristmasTicketReference } from '../utils/orderRef';

export class PurchaseChristmasTicketUseCase implements PurchaseChristmasTicketInboundPort {
  constructor(
    private settingsRepo: ChristmasPartySettingsRepositoryOutboundPort,
    private orderRepo: OrderRepositoryOutboundPort,
    private paymentGateway: PaymentGatewayOutboundPort
  ) {}

  async execute(input: PurchaseChristmasTicketInput): Promise<Order> {
    const settings = await this.settingsRepo.getSettings();

    if (!settings.partyDateTime || !settings.eventYear) {
      throw new Error('No Christmas party is currently scheduled.');
    }

    const saleStartMs = settings.saleStartAt ? Date.parse(settings.saleStartAt) : NaN;
    if (Number.isNaN(saleStartMs) || Date.now() < saleStartMs) {
      throw new Error('Ticket sales have not opened yet. Please wait for the countdown to finish.');
    }

    if (!input.userName || input.userName.trim().length === 0) {
      throw new Error('Customer name is required.');
    }

    if (!input.userEmail || input.userEmail.trim().length === 0) {
      throw new Error('Customer email address is required.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.userEmail.trim())) {
      throw new Error('Please enter a valid email address.');
    }

    const year = settings.eventYear;
    const orderType = getChristmasTicketOrderType(year);
    const existingOrders = await this.orderRepo.getAllOrders();

    const activeTicketOrders = existingOrders.filter(
      (o) => o.orderType === orderType && o.status !== 'cancelled'
    );

    if (activeTicketOrders.length >= settings.maxTickets) {
      throw new Error('Sorry, all Christmas party tickets have sold out.');
    }

    const orderRef = generateNextChristmasTicketReference(existingOrders, year);
    const ticketUuid = crypto.randomUUID();
    const price = settings.ticketPrice;
    const paymentLinkUrl = this.paymentGateway.generatePaymentLink(orderRef, price);

    return this.orderRepo.createOrder(
      {
        id: orderRef,
        userName: input.userName.trim(),
        userEmail: input.userEmail.trim().toLowerCase(),
        ...(input.userId ? { userId: input.userId } : {}),
        items: [
          {
            productId: `christmas_party_${year}_ticket`,
            productName: `PRRC Christmas Party ${year} Ticket`,
            price,
            size: '1 Ticket',
            quantity: 1,
            subtotal: price,
          },
        ],
        totalAmount: price,
        status: 'pending_payment',
        monzoReference: orderRef,
        orderType,
        ticketUuid,
        eventYear: year,
        checkedIn: false,
      },
      paymentLinkUrl
    );
  }
}
