export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  size: string;
  quantity: number;
  imageUrl: string;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
}
