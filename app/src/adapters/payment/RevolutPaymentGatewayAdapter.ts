import { PaymentGatewayPort } from '@/domain/ports/PaymentGatewayPort';

export class RevolutPaymentGatewayAdapter implements PaymentGatewayPort {
  private readonly revolutUsername: string;

  constructor(revolutUsername: string = process.env.NEXT_PUBLIC_REVOLUT_USERNAME || 'terenclgf') {
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
