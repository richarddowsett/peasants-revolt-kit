export type OrderStatus = 'pending_payment' | 'payment_successful' | 'order_sent' | 'completed' | 'cancelled';

export type OrderType = 'kit' | `christmas_${number}_ticket`;

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  size: string;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string; // Unique Order Reference e.g. "PRRC-8492" or "PRRC-XMAS-2026-0001"
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
  ticketUuid?: string;
  eventYear?: number;
  ticketEmailSentAt?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

