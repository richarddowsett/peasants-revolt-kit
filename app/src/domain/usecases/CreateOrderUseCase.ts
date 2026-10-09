import { OrderRepositoryPort } from '../ports/OrderRepositoryPort';
import { PaymentGatewayPort } from '../ports/PaymentGatewayPort';
import { Order, OrderItem } from '../models/Order';
import { generateNextMonzoReference } from '../utils/orderRef';

export interface CreateOrderCommand {
  userEmail: string;
  userName: string;
  userId?: string;
  items: Omit<OrderItem, 'subtotal'>[];
}

export class CreateOrderUseCase {
  constructor(
    private orderRepo: OrderRepositoryPort,
    private paymentGateway: PaymentGatewayPort
  ) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    if (!command.items || command.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    const calculatedItems: OrderItem[] = command.items.map((item) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }));

    const totalAmount = calculatedItems.reduce((acc, item) => acc + item.subtotal, 0);

    const existingOrders = await this.orderRepo.getAllOrders();
    const tempOrderRef = generateNextMonzoReference(existingOrders);


    const paymentLinkUrl = this.paymentGateway.generatePaymentLink(tempOrderRef, totalAmount);

    const orderData = {
      userEmail: command.userEmail,
      userName: command.userName,
      userId: command.userId,
      items: calculatedItems,
      totalAmount,
      status: 'pending_payment' as const,
      monzoReference: tempOrderRef,
    };

    return this.orderRepo.createOrder(orderData, paymentLinkUrl);
  }
}
