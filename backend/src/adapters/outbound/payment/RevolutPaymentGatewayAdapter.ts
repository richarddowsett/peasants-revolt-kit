import { PaymentGatewayOutboundPort } from '../../../domain/ports/outbound/PaymentGatewayOutboundPort';

export class RevolutPaymentGatewayAdapter implements PaymentGatewayOutboundPort {
  private readonly revolutUsername: string;

  constructor(revolutUsername: string = process.env.REVOLUT_USERNAME || 'terenclgf') {
    this.revolutUsername = revolutUsername;
  }

  generatePaymentLink(orderReference: string, amount: number): string {
    const amountInPence = Math.round(amount * 100);
    const encodedRef = encodeURIComponent((orderReference || '').trim());
    const noteParam = encodedRef ? `&note=${encodedRef}` : '';
    return `https://revolut.me/${this.revolutUsername}?currency=GBP&amount=${amountInPence}${noteParam}`;
  }

  getGatewayName(): string {
    return 'Revolut';
  }
}
