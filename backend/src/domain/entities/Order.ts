export type OrderStatus = 'pending_payment' | 'payment_successful' | 'completed' | 'cancelled';

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
  createdAt: string;
  updatedAt: string;
}
