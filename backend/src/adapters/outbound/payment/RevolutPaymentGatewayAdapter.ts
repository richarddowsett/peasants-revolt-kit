import { PaymentGatewayOutboundPort } from '../../../domain/ports/outbound/PaymentGatewayOutboundPort';

export class RevolutPaymentGatewayAdapter implements PaymentGatewayOutboundPort {
  private readonly revolutUsername: string;

  constructor(revolutUsername: string = process.env.REVOLUT_USERNAME || 'terenclgf') {
    this.revolutUsername = revolutUsername;
  }

  generatePaymentLink(_orderReference: string, amount: number): string {
    const amountInPence = Math.round(amount * 100);
    return `https://revolut.me/${this.revolutUsername}?currency=GBP&amount=${amountInPence}`;
  }

  getGatewayName(): string {
    return 'Revolut';
  }
}
