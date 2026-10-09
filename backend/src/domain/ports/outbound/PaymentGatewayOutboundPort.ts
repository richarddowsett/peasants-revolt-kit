export interface PaymentGatewayOutboundPort {
  generatePaymentLink(orderReference: string, amount: number): string;
  getGatewayName(): string;
}
