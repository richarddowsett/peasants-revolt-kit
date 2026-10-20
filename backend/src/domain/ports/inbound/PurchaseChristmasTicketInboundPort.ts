import { Order } from '../../entities/Order';

export interface PurchaseChristmasTicketInput {
  userName: string;
  userEmail: string;
  userId?: string;
}

export interface PurchaseChristmasTicketInboundPort {
  execute(input: PurchaseChristmasTicketInput): Promise<Order>;
}
