export type OrderStatus = 'pending_payment' | 'payment_successful' | 'order_sent' | 'completed' | 'cancelled';

export type OrderType = 'kit' | 'event_ticket' | `christmas_${number}_ticket`;

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  size: string;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userEmail: string;
  userName: string;
  userId?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentLinkUrl: string;
  monzoReference: string;
  batchRef?: string;
  orderType?: OrderType;
  eventId?: string;
  eventTitle?: string;
  eventStartDate?: string;
  eventAddress?: string;
  ticketUuid?: string;
  eventYear?: number;
  ticketEmailSentAt?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
}
