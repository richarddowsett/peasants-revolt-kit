import { CreateOrderInboundPort, CreateOrderCommand } from '../ports/inbound/CreateOrderInboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { PaymentGatewayOutboundPort } from '../ports/outbound/PaymentGatewayOutboundPort';
import { Order, OrderItem } from '../entities/Order';
import { generateNextMonzoReference } from '../utils/orderRef';

export class CreateOrderUseCase implements CreateOrderInboundPort {
  constructor(
    private orderRepo: OrderRepositoryOutboundPort,
    private paymentGateway: PaymentGatewayOutboundPort
  ) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    if (!command.items || command.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    if (!command.userName || !command.userName.trim()) {
      throw new Error('Customer name is required.');
    }

    if (!command.userEmail || !command.userEmail.trim()) {
      throw new Error('Customer email is required.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(command.userEmail.trim())) {
      throw new Error('A valid customer email is required.');
    }

    const calculatedItems: OrderItem[] = command.items.map((item) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }));

    const totalAmount = calculatedItems.reduce((acc, item) => acc + item.subtotal, 0);

    const existingOrders = await this.orderRepo.getAllOrders();
    const orderRef = generateNextMonzoReference(existingOrders);


    const paymentLinkUrl = this.paymentGateway.generatePaymentLink(orderRef, totalAmount);

    const orderData = {
      id: orderRef,
      userEmail: command.userEmail.trim(),
      userName: command.userName.trim(),
      userId: command.userId,
      items: calculatedItems,
      totalAmount,
      status: 'pending_payment' as const,
      monzoReference: orderRef,
    };

    return this.orderRepo.createOrder(orderData, paymentLinkUrl);
  }
}
