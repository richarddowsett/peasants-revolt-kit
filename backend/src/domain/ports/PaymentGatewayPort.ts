export interface PaymentGatewayPort {
  generatePaymentLink(orderReference: string, amount: number): string;
  getGatewayName(): string;
}
